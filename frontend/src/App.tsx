import AdminPanel from './AdminPanel';
import React, { useState, useEffect, type ChangeEvent, useMemo } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { 
  User as UserIcon, 
  LogOut, 
  Home, 
  Calculator, 
  ChevronLeft, 
  ChevronRight,
  Upload,
  ExternalLink,
  MapPin,
  Loader2,
  Inbox,
  Shield
} from 'lucide-react';

const OKRUGS = ["НАО", "ТАО", "ЦАО", "САО", "ЮАО", "ЗАО", "ВАО", "ЮЗАО", "ЮВАО", "СЗАО", "СВАО", "ЗелАО"] as const;

const DISTRICTS = [
  "Академический", "Алексеевский", "Алтуфьевский", "Арбат", "Аэропорт", "Бабушкинский", "Басманный", "Беговой", 
  "Бескудниковский", "Бибирево", "Бирюлево Восточное", "Бирюлево Западное", "Богородское", "Братеево", "Бутырский", 
  "Вешняки", "Внуково", "Войковский", "Восточное Дегунино", "Восточное Измайлово", "Восточный", "Выхино-Жулебино", 
  "Гагаринский", "Головинский", "Гольяново", "Даниловский", "Дмитровский", "Донской", "Дорогомилово", "Замоскворечье", 
  "Западное Дегунино", "Зюзино", "Зябликово", "Ивановское", "Измайлово", "Капотня", "Коньково", "Коптево", 
  "Косино-Ухтомский", "Котловка", "Красносельский", "Крылатское", "Крюково", "Кузьминки", "Кунцево", "Куркино", 
  "Левобережный", "Лефортово", "Лианозово", "Ломоносовский", "Лосиноостровский", "Люблино", "Марфино", "Марьина роща", 
  "Марьино", "Матушкино", "Метрогородок", "Мещанский", "Митино", "Можайский", "Молжаниновский", "Москворечье-Сабурово", 
  "Нагатино-Садовники", "Нагатинский затон", "Нагорный", "НАО", "Некрасовка", "Нижегородский", "Новогиреево", 
  "Новокосино", "Ново-Переделкино", "Обручевский", "Орехово-Борисово Северное", "Орехово-Борисово Южное", "Останкинский", 
  "Отрадное", "Очаково-Матвеевское", "Перово", "Печатники", "Покровское-Стрешнево", "Преображенское", "Пресненский", 
  "Проспект Вернадского", "Раменки", "Ростокино", "Рязанский", "Савёлки", "Савеловский", "Свиблово", "Северное Бутово", 
  "Северное Измайлово", "Северное Медведково", "Северное Тушино", "Северный", "Силино", "Сокол", "Соколиная гора", 
  "Сокольники", "Солнцево", "Старое Крюково", "Строгино", "Таганский", "ТАО", "Тверской", "Текстильщики", "Теплый Стан", 
  "Тимирязевский", "Тропарево-Никулино", "Филевский парк", "Фили-Давыдково", "Хамовники", "Ховрино", "Хорошево-Мневники", 
  "Хорошевский", "Царицыно", "Черемушки", "Чертаново Северное", "Чертаново Центральное", "Чертаново Южное", "Щукино", 
  "Южное Бутово", "Южное Медведково", "Южное Тушино", "Южнопортовый", "Якиманка", "Ярославский", "Ясенево"
];

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const getPaginationRange = (current: number, total: number) => {
  const delta = 2; 
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }
  return rangeWithDots;
};

export default function App() {
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lon: number, address: string} | null>(null);
  const [view, setView] = useState<'flats' | 'predict' | 'auth' | 'profile' | 'admin'>('flats');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [flats, setFlats] = useState<any[]>([]);
  const [totalFlats, setTotalFlats] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [filters, setFilters] = useState({
    min_price: '',
    max_price: '',
    okrug: '',
    rooms: '',
  });

  const [predictForm, setPredictForm] = useState({
    area: 50,
    rooms_count: 1,
    floor: 5,
    total_floors: 12,
    metro_min: 10,
    is_apartament: false,
    is_studio: false,
    is_new_moscow: false,
    okrug: 'ЦАО',
    district: 'Арбат'
  });
  
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [districtSearch, setDistrictSearch] = useState('');
  const [isDistrictListOpen, setIsDistrictListOpen] = useState(false);

  const filteredDistricts = useMemo(() => {
    return DISTRICTS.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase()));
  }, [districtSearch]);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { if (view === 'flats') fetchFlats(); }, [view, currentPage, filters]);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (e) { setUser(null); } 
    finally { setLoading(false); }
  };

  const fetchFlats = async () => {
    setIsFetching(true);
    try {
      const params = {
        limit: 18,
        offset: (currentPage - 1) * 18,
        min_price: filters.min_price || undefined,
        max_price: filters.max_price || undefined,
        okrug: filters.okrug || undefined,
        rooms: filters.rooms || undefined,
      };
      const res = await api.get('/flats', { params });
      setFlats(res.data.items);
      setTotalFlats(res.data.total);
      setTotalPages(res.data.pages);
    } catch (e) { console.error(e); }
    finally { setIsFetching(false); }
  };

  const handleOpenMap = async (flatId: number) => {
    try {
      const res = await api.get(`/flats/${flatId}/coords`);
      setSelectedCoords(res.data);
    } catch (e) {
      alert("Не удалось получить координаты квартиры 0_o");
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);
    setPredictionResult(null);

    const delay = Math.floor(Math.random() * 1000) + 1000;

    try {
      const res = await api.post('/flats/predict', predictForm);
      setTimeout(() => {
        setPredictionResult(res.data);
        setIsPredicting(false);
      }, delay);
    } catch (e) {
      alert("Ошибка при расчете.");
      setIsPredicting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error("Ошибка при логауте на сервере", e);
    } finally {
      setUser(null);
      setView('flats');
    }
  };

  if (loading) return <div className="loader">Загрузка системы... 🚀</div>;

  return (
    <div className="app-container">
      <Helmet>
        <title>
          {view === 'flats' ? 'Купить квартиру в Москве | Flats Analyze' : 
           view === 'predict' ? 'Умная оценка недвижимости ML | Flats Analyze' : 
           view === 'admin' ? 'Админ-панель | Flats Analyze' :
           'Личный кабинет | Flats Analyze'}
        </title>
        <link rel="canonical" href={`http://localhost:5173/${view === 'flats' ? '' : view}`} />
        <meta name="description" content="Сервис для поиска и оценки стоимости недвижимости в Москве с помощью машинного обучения" />
        <meta property="og:title" content="Поиск недвижимости" />
        <meta property="og:description" content="Умный поиск и ML оценка квартир в Москве" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            "name": "Аналитика недвижимости Москвы",
            "description": "Поиск и оценка стоимости квартир с помощью ML",
            "url": "http://localhost:5173"
          })}
        </script>
      </Helmet>

      {/* SEO заголовок h1, скрыт для пользователей, виден для роботов */}
      <h1 style={{ display: 'none' }}>Flats Analyze — Аналитика и поиск недвижимости в Москве</h1>

      <header className="main-header">
        <div className="logo" onClick={() => setView('flats')}>
          <span>Flats</span> Analyze 🏢
        </div>
        <nav className="nav-links">
          <button onClick={() => setView('flats')} className={view === 'flats' ? 'active' : ''}>
            <Home size={18} /> Купить
          </button>
          <button onClick={() => setView('predict')} className={view === 'predict' ? 'active' : ''}>
            <Calculator size={18} /> Оценка ML
          </button>
        </nav>
        <div className="user-block">
          {user ? (
            <div className="profile-chip" onClick={() => setView('profile')}>
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`} 
                  className="mini-avatar" 
                  alt={`Профиль ${user.username}`}
                />
              ) : <UserIcon size={18} />}
              <span>{user.username}</span>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setView('auth')}>Войти</button>
          )}
        </div>
      </header>

      <main className="content">
        {view === 'flats' && (
          <div className="view-animate" key="flats">
            <section className="flats-view">
              <div className="filters-bar">
                <select value={filters.okrug} onChange={e => {setFilters({...filters, okrug: e.target.value}); setCurrentPage(1)}}>
                  <option value="">Все округа</option>
                  {OKRUGS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <input type="number" placeholder="Мин. цена" value={filters.min_price} onChange={e => {setFilters({...filters, min_price: e.target.value}); setCurrentPage(1)}} />
                <input type="number" placeholder="Макс. цена" value={filters.max_price} onChange={e => {setFilters({...filters, max_price: e.target.value}); setCurrentPage(1)}} />
                <select value={filters.rooms} onChange={e => {setFilters({...filters, rooms: e.target.value}); setCurrentPage(1)}}>
                  <option value="">Комнаты</option>
                  {[0,1,2,3,4,5,6].map(r => <option key={r} value={r}>{r === 0 ? 'Студия' : r}</option>)}
                </select>
                
                <div className="total-counter">
                  Найдено: <strong>{totalFlats}</strong> объектов
                </div>

                <Pagination 
                  current={currentPage} 
                  total={totalPages} 
                  onChange={(p) => setCurrentPage(p)} 
                />
              </div>

              {isFetching ? (
                <div className="loader-inline"><Loader2 className="animate-spin" /> Обновляем список...</div>
              ) : flats.length > 0 ? (
                <>
                  <div className="flats-grid">
                    {flats.map(flat => (
                      <div key={flat.id} className="flat-card">
                        <div className="flat-price">{flat.price.toLocaleString()} ₽</div>
                        <h3 className="flat-title">{flat.title}</h3>
                        <p className="flat-info">📏 {flat.area} м² • {flat.rooms_count} комн. • {flat.floor}/{flat.total_floors} эт.</p>
                        <p className="flat-address"><MapPin size={14} /> {flat.address}</p>
                        <div className="flat-tags">
                          <span>{flat.okrug}</span>
                          {flat.metro_name && <span>🚇 {flat.metro_name} ({flat.metro_min} мин)</span>}
                        </div>
                        <a href={flat.link} target="_blank" rel="noreferrer" className="view-link">
                          На источник <ExternalLink size={14} />
                        </a>
                        <button 
                          onClick={() => handleOpenMap(flat.id)}
                          className="map-button-inline"
                        >
                          <MapPin size={14} /> Показать на карте
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <Pagination 
                    current={currentPage} 
                    total={totalPages} 
                    onChange={(p) => {
                      setCurrentPage(p);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                  />
                </>
              ) : (
                <div className="empty-state">
                  <Inbox size={48} />
                  <h3>Ничего не найдено</h3>
                  <p>Попробуйте смягчить фильтры или выбрать другой округ 🔍</p>
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'predict' && (
          <div className="view-animate" key="predict">
            <section className="predict-view">
              <div className="predict-container">
                <h2>Умный расчет стоимости 🤖</h2>
                <p>Модель проанализирует текущий рынок и выдаст прогноз цены</p>
                
                <form className="predict-form" onSubmit={handlePredict}>
                  <div className="double-input">
                    <div className="form-group">
                      <label htmlFor="area">Площадь (м²)</label>
                      <input id="area" type="number" value={predictForm.area} onChange={e => setPredictForm({...predictForm, area: +e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="rooms">Комнат</label>
                      <input id="rooms" type="number" value={predictForm.rooms_count} onChange={e => setPredictForm({...predictForm, rooms_count: +e.target.value})} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Этаж / Всего этажей</label>
                    <div className="double-input">
                      <input type="number" value={predictForm.floor} onChange={e => setPredictForm({...predictForm, floor: +e.target.value})} />
                      <input type="number" value={predictForm.total_floors} onChange={e => setPredictForm({...predictForm, total_floors: +e.target.value})} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="okrug-select">Округ</label>
                    <select id="okrug-select" value={predictForm.okrug} onChange={e => setPredictForm({...predictForm, okrug: e.target.value})}>
                      {OKRUGS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div className="form-group relative">
                    <label htmlFor="district-search">Район</label>
                    <div className="searchable-select">
                      <input 
                        id="district-search"
                        type="text" 
                        placeholder="Начните вводить название..." 
                        value={isDistrictListOpen ? districtSearch : predictForm.district}
                        onFocus={() => { setIsDistrictListOpen(true); setDistrictSearch(''); }}
                        onChange={(e) => setDistrictSearch(e.target.value)}
                      />
                      {isDistrictListOpen && (
                        <div className="dropdown-list">
                          {filteredDistricts.length > 0 ? filteredDistricts.map(d => (
                            <div key={d} className="dropdown-item" onClick={() => {
                              setPredictForm({...predictForm, district: d});
                              setIsDistrictListOpen(false);
                            }}>{d}</div>
                          )) : <div className="dropdown-item disabled">Нет совпадений</div>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="checkbox-group">
                    <label><input type="checkbox" checked={predictForm.is_apartament} onChange={e => setPredictForm({...predictForm, is_apartament: e.target.checked})} /> Апартаменты</label>
                    <label><input type="checkbox" checked={predictForm.is_studio} onChange={e => setPredictForm({...predictForm, is_studio: e.target.checked})} /> Студия</label>
                    <label><input type="checkbox" checked={predictForm.is_new_moscow} onChange={e => setPredictForm({...predictForm, is_new_moscow: e.target.checked})} /> Новая Москва</label>
                  </div>
                  
                  <button type="submit" className="predict-submit-btn" disabled={isPredicting}>
                    {isPredicting ? <><Loader2 className="animate-spin" /> Анализирую рынок...</> : "Рассчитать стоимость"}
                  </button>
                </form>

                {predictionResult && (
                  <div className="result-card">
                    <h3>Прогноз модели:</h3>
                    <div className="price-main">{predictionResult.total_price.toLocaleString()} ₽</div>
                    <p>Ориентировочно: {predictionResult.price_per_meter.toLocaleString()} ₽/м²</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {view === 'auth' && <div className="view-animate" key="auth"><AuthComponent onAuthSuccess={() => {checkAuth(); setView('flats')}} /></div>}
        
        {view === 'profile' && user && (
          <div className="view-animate" key="profile">
            <ProfileView 
              user={user} 
              onLogout={handleLogout} 
              onUpdate={checkAuth} 
              onUpdateView={(v: any) => setView(v)} 
            />
          </div>
        )}

        {/* проверка роли */}
        {view === 'admin' && user?.role === 'ADMIN' && (
          <div className="view-animate" key="admin">
            <AdminPanel onBack={() => setView('profile')} />
          </div>
        )}
      </main>

      {/* Модалка с картой */}
      {selectedCoords && (
        <div className="map-overlay" onClick={() => setSelectedCoords(null)}>
          <div className="map-modal" onClick={(e) => e.stopPropagation()}>
            <div className="map-modal-header">
              <span><MapPin size={18} color="#6366f1" /> {selectedCoords.address}</span>
              <button className="map-close-btn" onClick={() => setSelectedCoords(null)}>✕</button>
            </div>
            
            <div className="map-iframe-container">
              <iframe
                title={`Карта объекта по адресу ${selectedCoords.address}`}
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://yandex.ru/map-widget/v1/?ll=${selectedCoords.lon},${selectedCoords.lat}&z=15&pt=${selectedCoords.lon},${selectedCoords.lat},pm2rdl`}
                allowFullScreen={true}
              ></iframe>
            </div>

            <div className="map-modal-footer">
              <button 
                className="close-action-btn"
                onClick={() => setSelectedCoords(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Pagination({ current, total, onChange }: { current: number, total: number, onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages = getPaginationRange(current, total);

  return (
    <nav className="pagination" aria-label="Навигация по страницам">
      <button className="pag-nav" disabled={current === 1} onClick={() => onChange(current - 1)}>
        <ChevronLeft size={16} /> Назад
      </button>

      {pages.map((p, idx) => (
        <button
          key={idx}
          className={`pag-num ${p === current ? 'active' : ''} ${p === '...' ? 'dots' : ''}`}
          disabled={p === '...'}
          onClick={() => typeof p === 'number' && onChange(p)}
        >
          {p}
        </button>
      ))}

      <button className="pag-nav" disabled={current === total} onClick={() => onChange(current + 1)}>
        Вперед <ChevronRight size={16} />
      </button>
    </nav>
  );
}

function AuthComponent({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(isLogin ? '/auth/login' : '/auth/register', form);
      onAuthSuccess();
    } catch (e: any) { alert(e.response?.data?.detail || "Ошибка"); }
  };

  return (
    <div className="auth-box">
      <h2>{isLogin ? 'С возвращением!' : 'Создать аккаунт'}</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Логин" onChange={e => setForm({...form, username: e.target.value})} required />
        <input type="password" placeholder="Пароль" onChange={e => setForm({...form, password: e.target.value})} required />
        <button type="submit">{isLogin ? 'Войти' : 'Зарегистрироваться'}</button>
      </form>
      <p className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Еще нет аккаунта? Создать' : 'Уже есть профиль? Войти'}
      </p>
    </div>
  );
}

function ProfileView({ user, onLogout, onUpdate, onUpdateView }: any) {
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.append('file', e.target.files[0]);
    try {
      await api.post('/auth/me/avatar', fd);
      onUpdate();
    } catch (e) { 
      alert("Ошибка загрузки аватара"); 
    } finally {
      setIsUploading(false);
    }
  };

  const avatarSrc = user.avatar_url 
    ? `${user.avatar_url.startsWith('http') ? user.avatar_url : BASE_URL + user.avatar_url}?t=${new Date().getTime()}`
    : null;

  return (
    <section className="profile-view">
      <div className="profile-card">
        <div className="avatar-preview large">
          {isUploading ? (
            <div className="loader-avatar"><Loader2 className="animate-spin" /></div>
          ) : avatarSrc ? (
            <img src={avatarSrc} alt={`Аватар пользователя ${user.username}`} />
          ) : (
            <UserIcon size={60} />
          )}
          <label className="upload-label" title="Загрузить новый аватар">
            <Upload size={18} />
            <input type="file" hidden onChange={handleAvatar} />
          </label>
        </div>
        <h2>{user.username}</h2>
        <span className="role-badge">{user.role}</span>
        
        {user.role === 'ADMIN' && (
          <button className="admin-entry-btn" onClick={() => onUpdateView('admin')}>
            <Shield size={18} /> Панель управления
          </button>
        )}

        <button className="logout-action" onClick={onLogout}><LogOut size={18} /> Выйти из системы</button>
      </div>
    </section>
  );
}