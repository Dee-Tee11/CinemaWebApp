import React, { useState } from 'react';
import { X, Heart, Star, Eye, User, ChevronLeft, UserPlus, Check, XCircle } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import './ProfileModal.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  likedMovies?: number;
  favoriteMovies?: number;
  watchedMovies?: number;
  friendCount?: number;
  friends?: { id: number; name: string }[];
  friendRequests?: { id: number; name: string }[];
}

export default function ProfileModal({
  isOpen,
  onClose,
  likedMovies = 0,
  favoriteMovies = 0,
  watchedMovies = 0,
  friendCount = 5,
  friends = [
    { id: 1, name: 'Carlos Mendes' },
    { id: 2, name: 'Sofia Lopes' },
    { id: 3, name: 'Rafael Costa' },
    { id: 4, name: 'Beatriz Almeida' },
    { id: 5, name: 'Tiago Ferreira' },
  ],
  friendRequests = [
    { id: 6, name: 'Ana Pereira' },
    { id: 7, name: 'João Silva' },
  ],
}: ProfileModalProps) {
  const { user } = useUser();
  const [showFriends, setShowFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  if (!isOpen) return null;

  const userName = user?.fullName || user?.username || 'Usuário';
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';

  const handleAcceptFriend = (id: number) => {
    console.log(`Aceitou pedido de amizade do ID ${id}`);
  };

  const handleRejectFriend = (id: number) => {
    console.log(`Recusou pedido de amizade do ID ${id}`);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="modal">
        {/* Header */}
        <div className="header">
          {(showFriends || showFriendRequests) && (
            <button className="back-button" onClick={() => {
              setShowFriends(false);
              setShowFriendRequests(false);
            }}>
              <ChevronLeft size={24} />
            </button>
          )}
          <h2 className={`header-title ${showFriends || showFriendRequests ? 'centered' : ''}`}>
            {showFriendRequests ? 'Pedidos de Amizade' : showFriends ? 'Meus Amigos' : 'Meu Perfil'}
          </h2>
          <div className="header-buttons">
            {/* Friend Requests Icon with Badge */}
            <button
              className="icon-button friend-requests"
              aria-label="Ver pedidos de amizade"
              onClick={() => {
                setShowFriends(false);
                setShowFriendRequests(!showFriendRequests);
              }}
            >
              <UserPlus size={20} />
              {friendRequests.length > 0 && (
                <span className="badge">{friendRequests.length}</span>
              )}
            </button>
            {/* Close Button */}
            <button className="icon-button close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {/* User Info */}
          <div className="user-info">
            <div className="avatar-container">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={userName} className="avatar-image" />
              ) : (
                <User size={50} color="white" />
              )}
            </div>
            <h3 className="user-name">{userName}</h3>
            {userEmail && <p className="user-email">{userEmail}</p>}
            {/* Friends Toggle Button */}
            <button
              className={`friends-toggle ${showFriends ? 'underline' : ''}`}
              onClick={() => {
                setShowFriends(!showFriends);
                setShowFriendRequests(false);
              }}
            >
              <User size={18} color="#991b1b" />
              Amigos: {friendCount}
            </button>
          </div>

          {/* Content Switch */}
          {showFriendRequests ? (
            // Friend Requests List
            <div className="list-container">
              {friendRequests.length > 0 ? (
                <ul className="list">
                  {friendRequests.map((request) => (
                    <li key={request.id} className="request-item">
                      <span>{request.name}</span>
                      <div className="request-buttons">
                        <button
                          className="request-button accept"
                          onClick={() => handleAcceptFriend(request.id)}
                        >
                          <Check size={16} color="#22c55e" />
                        </button>
                        <button
                          className="request-button reject"
                          onClick={() => handleRejectFriend(request.id)}
                        >
                          <XCircle size={16} color="#ef4444" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items">Nenhum pedido de amizade pendente.</p>
              )}
            </div>
          ) : showFriends ? (
            // Friends List
            <div className="list-container">
              {friends.length > 0 ? (
                <ul className="list">
                  {friends.map((friend) => (
                    <li key={friend.id} className="list-item">
                      <span>{friend.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items">Nenhum amigo ainda.</p>
              )}
            </div>
          ) : (
            // Stats Grid
            <div className="stats-grid">
              {/* Liked Movies */}
              <div className="stat-item liked">
                <div className="stat-icon liked">
                  <Heart size={20} color="#ef4444" fill="#ef4444" />
                </div>
                <div className="stat-value">{likedMovies}</div>
                <div className="stat-label">Gostei</div>
              </div>
              {/* Favorite Movies */}
              <div className="stat-item favorite">
                <div className="stat-icon favorite">
                  <Star size={20} color="#eab308" fill="#eab308" />
                </div>
                <div className="stat-value">{favoriteMovies}</div>
                <div className="stat-label">Favoritos</div>
              </div>
              {/* Watched Movies */}
              <div className="stat-item watched">
                <div className="stat-icon watched">
                  <Eye size={20} color="#3b82f6" />
                </div>
                <div className="stat-value">{watchedMovies}</div>
                <div className="stat-label">Vistos</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}