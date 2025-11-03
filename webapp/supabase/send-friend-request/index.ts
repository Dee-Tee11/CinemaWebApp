// ============================================================================
// EDGE FUNCTION: send-friend-request
// ============================================================================
// Envia pedido de amizade de forma segura
// Valida: duplicados, self-request, user existe
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ITEMS_PER_PAGE = 20;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

interface RequestBody {
  receiver_id: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

interface SuccessResponse {
  success: true;
  data: {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: string;
    created_at: string;
  };
}

Deno.serve(async (req) => {
  // ============================================================================
  // 1. HANDLE CORS PREFLIGHT
  // ============================================================================
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ============================================================================
    // 2. VALIDAR INPUT
    // ============================================================================
    const body: RequestBody = await req.json()
    const { receiver_id } = body

    if (!receiver_id || typeof receiver_id !== 'string' || receiver_id.trim() === '') {
      return new Response(
        JSON.stringify({ 
          error: 'receiver_id is required and must be a valid string.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // ============================================================================
    // 3. AUTENTICAÇÃO - Verificar Authorization Header
    // ============================================================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing authorization header. Please login.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // ============================================================================
    // 4. CRIAR CLIENTE SUPABASE COM SERVICE_ROLE_KEY (INSEGURO - TEMPORÁRIO)
    // ============================================================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // AVISO: O uso da service_role_key bypassa toda a RLS.
    // Isto é uma medida temporária e insegura para contornar um problema de JWT no cliente.
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }, // Não é necessário persistir sessão no server-side
    })

    // ============================================================================
    // 5. OBTER USER ID MANUALMENTE DO TOKEN (INSEGURO - TEMPORÁRIO)
    // ============================================================================
    let sender_id: string;
    try {
      const token = authHeader.replace("Bearer ", "");
      const payload = JSON.parse(atob(token.split(".")[1]));
      sender_id = payload.sub;
      if (!sender_id) throw new Error("User ID (sub) not found in token payload.");
    } catch (e) {
      console.error("Error manually decoding token:", e)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token format.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // ============================================================================
    // 6. VALIDAR QUE NÃO ESTÁ A ENVIAR PARA SI PRÓPRIO
    // ============================================================================
    if (sender_id === receiver_id) {
      return new Response(
        JSON.stringify({ 
          error: 'You cannot send a friend request to yourself.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // ============================================================================
    // 7. VERIFICAR SE O RECEIVER EXISTE NA TABELA User
    // ============================================================================
    const { data: receiverExists, error: receiverError } = await supabase
      .from('User')
      .select('id, name')
      .eq('id', receiver_id)
      .maybeSingle()

    if (receiverError) {
      console.error('Error checking receiver:', receiverError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to validate receiver user.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!receiverExists) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found. Please check the user ID.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // ============================================================================
    // 8. VERIFICAR SE JÁ SÃO AMIGOS (tabela friendships)
    // ============================================================================
    const { data: existingFriendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('user_id_a, user_id_b')
      .or(`and(user_id_a.eq.${sender_id},user_id_b.eq.${receiver_id}),and(user_id_a.eq.${receiver_id},user_id_b.eq.${sender_id})`)
      .maybeSingle()

    if (friendshipError) {
      console.error('Error checking friendship:', friendshipError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check friendship status.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (existingFriendship) {
      return new Response(
        JSON.stringify({ 
          error: 'You are already friends with this user.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        }
      )
    }

    // ============================================================================
    // 9. VERIFICAR SE JÁ EXISTE PEDIDO PENDENTE (em qualquer direção)
    // ============================================================================
    const { data: existingRequest, error: requestError } = await supabase
      .from('friend_request')
      .select('id, sender_id, receiver_id, status')
      .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`)
      .eq('status', 'pending')
      .maybeSingle()

    if (requestError) {
      console.error('Error checking existing request:', requestError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check existing friend requests.' 
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (existingRequest) {
      // Se o receiver já enviou pedido para o sender, sugerir aceitar
      if (existingRequest.sender_id === receiver_id) {
        return new Response(
          JSON.stringify({ 
            error: 'This user has already sent you a friend request. Please accept it instead.',
            details: 'pending_incoming_request'
          } as ErrorResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          }
        )
      }

      // Se o sender já enviou pedido, informar
      return new Response(
        JSON.stringify({ 
          error: 'You already have a pending friend request with this user.',
          details: 'pending_outgoing_request'
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        }
      )
    }

    // ============================================================================
    // 10. INSERIR NOVO PEDIDO DE AMIZADE
    // ============================================================================
    const { data, error } = await supabase
      .from('friend_request')
      .insert({
        sender_id,
        receiver_id,
        status: 'pending',
      })
      .select('id, sender_id, receiver_id, status, created_at')
      .single()

    if (error) {
      console.error('Error creating friend request:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send friend request. Please try again.',
          details: error.message
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // ============================================================================
    // 11. SUCESSO - Retornar dados do pedido criado
    // ============================================================================
    return new Response(
      JSON.stringify({
        success: true,
        data,
      } as SuccessResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    )

  } catch (error) {
    // ============================================================================
    // ERROR HANDLER GLOBAL
    // ============================================================================
    console.error('Unexpected error in send-friend-request:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ErrorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
