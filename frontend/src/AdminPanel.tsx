import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield,
  Ban, 
  CheckCircle, 
  Users, 
  ArrowLeft,
  Loader2,
  Trash2
} from 'lucide-react';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (e) {
      console.error("Ошибка при загрузке пользователей", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/status`, null, {
        params: { is_active: !currentStatus }
      });
      await fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Ошибка смены статуса");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Поменять роль на ${newRole}?`)) return;

    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, null, {
        params: { new_role: newRole }
      });
      await fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Ошибка смены роли");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Удалить пользователя навсегда? Это действие необратимо.")) return;

    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (e: any) {
      alert(e.response?.data?.detail || "Ошибка удаления");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="loader"><Loader2 className="animate-spin" /> Загрузка базы данных...</div>;

  return (
    <div className="view-animate admin-view">
      <div className="admin-header-box">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} /> Назад
        </button>
        <h2>Панель администратора <Shield size={24} className="text-accent" /></h2>
      </div>

      <div className="users-table-container">
        <div className="table-stats">
          <Users size={16} /> Всего в системе: <strong>{users.length}</strong>
        </div>

        <div className="users-list">
          {users.map((u) => {
            // Формируем URL аватарки так же, как в App.tsx
            const avatarSrc = u.avatar_url 
              ? (u.avatar_url.startsWith('http') ? u.avatar_url : `${BASE_URL}${u.avatar_url}`)
              : null;

            return (
              <div key={u.id} className={`user-admin-card ${!u.is_active ? 'banned' : ''}`}>
                <div className="user-main-info">
                  <div className="user-avatar-stub">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="avatar" className="admin-user-img" />
                    ) : (
                      u.username[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="user-name-row">
                      <h3>{u.username}</h3>
                      <span className={`role-tag ${u.role.toLowerCase()}`}>{u.role}</span>
                    </div>
                    <p className="user-id">ID: {u.id} • {u.is_active ? '✅ Активен' : '🚫 Заблокирован'}</p>
                  </div>
                </div>

                <div className="admin-actions">
                  <button 
                    className="action-btn role" 
                    title="Сменить роль"
                    disabled={actionLoading === u.id}
                    onClick={() => handleUpdateRole(u.id, u.role)}
                  >
                    <Shield size={18} />
                  </button>
                  
                  <button 
                    className={`action-btn ${u.is_active ? 'ban' : 'unban'}`}
                    title={u.is_active ? "Забанить" : "Разбанить"}
                    disabled={actionLoading === u.id}
                    onClick={() => handleToggleStatus(u.id, u.is_active)}
                  >
                    {u.is_active ? <Ban size={18} /> : <CheckCircle size={18} />}
                  </button>

                  <button 
                    className="action-btn delete" 
                    title="Удалить"
                    disabled={actionLoading === u.id}
                    onClick={() => handleDeleteUser(u.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}