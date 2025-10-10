import React, { useState, useEffect } from 'react';
import { X, UserPlus as AddFriendIcon } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase'; // Ajuste o caminho conforme necessário
import './AddFriend.css';

interface AddFriendPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFriendPopup: React.FC<AddFriendPopupProps> = ({ isOpen, onClose }) => {
  const supabase = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedFriends, setSuggestedFriends] = useState<{ id: string; name: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Carrega o ID do usuário autenticado
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      else console.log('Usuário não autenticado');
    };
    getUser();
  }, [supabase]);

  // Busca usuários com base no searchQuery
  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchQuery.trim()) {
        setSuggestedFriends([]);
        return;
      }
      console.log('Buscando usuários para:', searchQuery);
      const { data, error } = await supabase
        .from('User')
        .select('id, name')
        .ilike('name', `%${searchQuery.trim().toLowerCase()}%`)
        .neq('id', currentUserId) // Exclui o usuário logado dos resultados
        .limit(5);
      if (error) {
        console.error('Erro ao buscar usuários:', error.message);
      } else {
        console.log('Resultados da busca:', data);
        setSuggestedFriends(data || []);
      }
    };
    fetchUsers();
  }, [searchQuery, supabase, currentUserId]);

  const handleAddFriend = async (friendId: string) => {
    if (!currentUserId) {
      console.error('Usuário não autenticado');
      return;
    }
    console.log(`Adicionando amigo com ID: ${friendId}`);
    const { error } = await supabase.from('FriendRequests').insert({
      user_id: currentUserId,
      friend_id: friendId,
      status: 'pending',
    });
    if (error) console.error('Erro ao enviar pedido de amizade:', error);
    else console.log('Pedido de amizade enviado!');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="modal">
        {/* Premium Header */}
        <div className="header">
          <div className="header-content">
            <h2 className="header-title">Adiciona um amigo</h2>
            <span className="header-badge">e partilha momentos</span>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={26} />
          </button>
        </div>

        {/* Content */}
        <div className="content">
          {/* Premium Search Bar */}
          <div className="search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar amigos..."
              className="search-input"
            />
            <AddFriendIcon size={20} className="search-icon" />
          </div>

          {/* Suggested Friends List */}
          <div className="friends-list">
            {suggestedFriends.length > 0 ? (
              suggestedFriends.map(friend => (
                <div key={friend.id} className="friend-item">
                  <span className="friend-name">{friend.name}</span>
                  <button className="add-button" onClick={() => handleAddFriend(friend.id)}>
                    <AddFriendIcon size={16} /> Adicionar
                  </button>
                </div>
              ))
            ) : (
              searchQuery && <p className="no-results">Nenhum usuário encontrado.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AddFriendPopup;