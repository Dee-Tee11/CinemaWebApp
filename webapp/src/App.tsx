import Silk from "./components/Silk";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { useSupabase } from "./hooks/useSupabase"; // Hook personalizado para interagir com o cliente Supabase.
import { useEffect, useState } from "react"; // Hooks do React para efeitos secundários e gestão de estado.
import styles from "./App.module.css"; // Importa estilos CSS modularizados para este componente.

/**
 * Componente principal da aplicação.
 * Gerencia a autenticação do utilizador com Clerk e a sincronização dos dados do utilizador com Supabase.
 */
function App() {
  // Obtém os dados do utilizador autenticado e o estado de carregamento do Clerk.
  const { user, isLoaded } = useUser();
  // Inicializa o cliente Supabase através do hook personalizado.
  const supabase = useSupabase();

  // Estado para armazenar os dados do utilizador obtidos do Supabase.
  const [userData, setUserData] = useState<any[] | null>(null);
  // Estado para controlar se os dados do utilizador já foram sincronizados com o Supabase.
  const [synced, setSynced] = useState(false);

  /**
   * useEffect para sincronizar os dados do utilizador com o Supabase.
   * É acionado quando o estado de carregamento do Clerk, o objeto do utilizador ou o estado 'synced' mudam.
   * Garante que a sincronização ocorra apenas uma vez após o utilizador estar carregado e não sincronizado.
   */
  useEffect(() => {
    // Verifica se o utilizador está carregado, autenticado e ainda não sincronizado.
    if (isLoaded && user && !synced) {
      syncUserToSupabase(); // Chama a função de sincronização.
    }
  }, [isLoaded, user, synced]); // Dependências do useEffect.

  /**
   * Função assíncrona para sincronizar os dados do utilizador do Clerk para o Supabase.
   * Realiza um 'upsert' (insert ou update) na tabela 'User' do Supabase.
   */
  async function syncUserToSupabase() {
    try {
      // Verifica se o objeto do utilizador está disponível.
      if (!user) {
        // Se o utilizador não estiver carregado, sai da função.
        return;
      }

      // Tenta inserir ou atualizar o utilizador na tabela 'User' do Supabase.
      // O 'upsert' usa o 'id' do utilizador do Clerk como chave primária.
      const { error } = await supabase.from("User").upsert({
        id: user.id, // ID único do utilizador do Clerk.
        name: user.fullName, // Nome completo do utilizador.
        email: user.emailAddresses[0]?.emailAddress, // Endereço de e-mail principal do utilizador.
      });

      // Verifica se houve um erro durante a operação de upsert.
      if (error) {
        // Em caso de erro, a mensagem de erro seria registada aqui (anteriormente havia um console.error).
      } else {
        // Se a sincronização for bem-sucedida, define 'synced' como true.
        setSynced(true);

        // Após a sincronização, busca os dados completos do utilizador da tabela 'User' do Supabase.
        let data = null;
        if (user?.id) {
          const response = await supabase
            .from("User")
            .select("*") // Seleciona todas as colunas.
            .eq("id", user.id); // Filtra pelo ID do utilizador.
          data = response.data; // Armazena os dados retornados.
        }

        // Atualiza o estado 'userData' com os dados obtidos do Supabase.
        setUserData(data);
      }
    } catch (error) {
      // Captura e trata quaisquer erros que ocorram durante o processo de sincronização.
      // A mensagem de erro seria registada aqui (anteriormente havia um console.error).
    }
  }

  // Renderização do componente.
  return (
    <>
      {/* Div para o componente de fundo Silk, ocupando toda a viewport e posicionado atrás de outros elementos. */}
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -1, // Garante que o Silk fique no fundo.
        }}
      >
        <Silk color="#B22222" />{" "}
        {/* Renderiza o componente Silk com uma cor específica. */}
      </div>

      {/* Container principal para a interface do utilizador. */}
      <div className={styles.uiContainer}>
        {/* Wrapper para os botões de autenticação. */}
        <div className={styles.buttonsWrapper}>
          {/* Renderiza estes elementos apenas se o utilizador NÃO estiver autenticado. */}
          <SignedOut>
            {/* Botão de registo que abre um modal do Clerk. */}
            <SignUpButton mode="modal">
              <button className={styles.button}>Registar</button>
            </SignUpButton>
            {/* Botão de login que abre um modal do Clerk. */}
            <SignInButton mode="modal">
              <button className={styles.button}>Entrar</button>
            </SignInButton>
          </SignedOut>
          {/* Renderiza estes elementos apenas se o utilizador ESTIVER autenticado. */}
          <SignedIn>
            {/* Botão de utilizador do Clerk, que permite gerir a conta ou fazer logout. */}
            <UserButton afterSignOutUrl="/" />{" "}
            {/* Redireciona para a raiz após o logout. */}
            {/* Anteriormente, havia um bloco aqui para exibir informações de depuração do utilizador. */}
          </SignedIn>
        </div>
      </div>
    </>
  );
}

export default App; // Exporta o componente App como o export padrão.
