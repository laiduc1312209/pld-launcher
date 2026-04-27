import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  IconButton, 
  Button, 
  TextField, 
  InputAdornment,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Paper,
  Stack,
  Alert,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  createTheme,
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import { 
  HomeOutlined as Home, 
  PersonOutlined as Person, 
  SettingsOutlined as SettingsIcon, 
  Logout, 
  PlayArrow, 
  Search, 
  Add, 
  CloudQueue, 
  FolderOpen, 
  Sync,
  RocketLaunchOutlined as Rocket,
  Storage,
  Security,
  Window,
  FileOpen
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import Auth from './components/Auth';
import { 
  Button as FluentButton, 
  TabList, 
  Tab as FluentTab,
  Avatar as FluentAvatar,
  makeStyles,
  shorthands,
  tokens,
  Title2,
  Subtitle1,
  Caption1,
  ProgressBar
} from '@fluentui/react-components';
import { 
  HomeRegular, 
  HomeFilled, 
  PersonRegular, 
  PersonFilled, 
  SettingsRegular, 
  SettingsFilled,
  PlayRegular,
  ArrowSyncRegular,
  FolderRegular,
  SignOutRegular,
  AddRegular,
  SearchRegular,
  WindowConsoleRegular
} from '@fluentui/react-icons';

// --- Types ---
interface Game {
  gid: string;
  name: string;
  exe: string;
  save_dir: string;
  zip_name: string;
}

interface UserSession {
  email: string;
  id: string;
  registered_at: string;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '80px',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding('12px', '0'),
    alignItems: 'center',
    backdropFilter: 'blur(30px)',
  },
  mainArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebarHeader: {
    ...shorthands.margin('20px', '0', '40px', '0'),
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    ...shorthands.borderRadius('6px'),
    background: 'linear-gradient(45deg, #0078d4, #00bcf2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  tabList: {
    flexGrow: 1,
  },
  footer: {
    marginTop: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('16px'),
    width: '100%',
  },
  playButton: {
    position: 'absolute',
    right: '48px',
    bottom: '48px',
    minWidth: '180px',
    height: '56px',
    fontSize: '18px',
    fontWeight: 'bold',
    zIndex: 2,
    boxShadow: tokens.shadow28,
  },
  header: {
    ...shorthands.padding('32px', '40px', '16px', '40px'),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  }
});

const App: React.FC = () => {
  const styles = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [launchingStatus, setLaunchingStatus] = useState<string | null>(null);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [addDialogError, setAddDialogError] = useState('');
  const [newGame, setNewGame] = useState({ name: '', exe: '', save_dir: '' });
  const [settingsTab, setSettingsTab] = useState(0);

  const fetchLibrary = async () => {
    try {
      const lib = await invoke<Game[]>('get_library');
      setGames(lib || []);
    } catch (err) {
      console.error("Failed to fetch library:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchLibrary();
    }
  }, [isLoggedIn]);

  const handleLogin = (user: UserSession) => {
    setSession(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSession(null);
    setSelectedGame(null);
  };

  const handleBrowseExe = async () => {
    const selected = await open({
      filters: [{ name: 'Executables', extensions: ['exe'] }],
      multiple: false,
    });
    if (selected && typeof selected === 'string') {
      setNewGame(prev => ({ ...prev, exe: selected }));
      // Auto-fill name if empty
      if (!newGame.name) {
        const fileName = selected.split(/[\/\\]/).pop()?.replace('.exe', '');
        setNewGame(prev => ({ ...prev, name: fileName || '' }));
      }
    }
  };

  const handleBrowseSave = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected && typeof selected === 'string') {
      setNewGame(prev => ({ ...prev, save_dir: selected }));
    }
  };

  const handleAddGame = async () => {
    if (!newGame.name || !newGame.exe || !newGame.save_dir) {
      setAddDialogError("Please select both EXE and Save folder");
      return;
    }
    const gid = Math.random().toString(36).substring(2, 9);
    const updatedGames = [...games, { 
      gid, 
      ...newGame, 
      zip_name: `${newGame.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_save.zip` 
    }];
    try {
      await invoke('update_library', { games: updatedGames });
      setGames(updatedGames);
      setOpenAddDialog(false);
      setNewGame({ name: '', exe: '', save_dir: '' });
      setAddDialogError('');
    } catch (err) {
      setAddDialogError("Failed to add game: " + err);
    }
  };

  const handlePlay = async (game: Game) => {
    console.log("Play button clicked for game:", game.name);
    setLaunchingStatus("Preparing content...");
    try {
      const res = await invoke<string>('play_game', {
        exePath: game.exe,
        saveDir: game.save_dir,
        zipName: game.zip_name
      });
      console.log("Play command success:", res);
      setLaunchingStatus(null);
      alert(res);
    } catch (err: any) {
      console.error("Play command error:", err);
      setLaunchingStatus(null);
      alert("Lỗi khi chạy game: " + err);
    }
  };

  const handleBrowseFiles = async (game: Game) => {
    console.log("Browse Files clicked for:", game.exe);
    try {
      await invoke('shell_open', { path: game.exe }); 
    } catch (err) {
      console.error("Browse error:", err);
      alert("Không thể mở thư mục: " + err);
    }
  };

  const handleSyncNow = async (game: Game) => {
    setLaunchingStatus("Manual syncing...");
    try {
      // Tận dụng logic sync trong play_game nhưng không chạy game
      // Ở đây mình sẽ tạo 1 command riêng ở Rust sau
      alert("Tính năng đồng bộ thủ công đang được khởi tạo...");
      setLaunchingStatus(null);
    } catch (err) {
      setLaunchingStatus(null);
      alert("Lỗi đồng bộ: " + err);
    }
  };

  const filteredGames = games.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isLoggedIn) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Box className={styles.container}>
      {/* Sidebar - Fluent UI v9 */}
      <Box className={styles.sidebar}>
        <Box className={styles.sidebarHeader}>
          <img src="/icon.ico" style={{ width: 64, height: 64, objectFit: 'contain' }} alt="Logo" />
        </Box>

        <TabList
          vertical
          className={styles.tabList}
          selectedValue={activeTab}
          onTabSelect={(_, data) => {
            setActiveTab(data.value as string);
            setSelectedGame(null);
          }}
        >
          <FluentTab 
            value="library" 
            style={{ marginBottom: '16px' }}
            icon={activeTab === 'library' ? <HomeFilled style={{ fontSize: '48px' }} /> : <HomeRegular style={{ fontSize: '48px' }} />}
          />
          <FluentTab 
            value="profile" 
            style={{ marginBottom: '16px' }}
            icon={activeTab === 'profile' ? <PersonFilled style={{ fontSize: '48px' }} /> : <PersonRegular style={{ fontSize: '48px' }} />}
          />
          <FluentTab 
            value="settings" 
            style={{ marginBottom: '16px' }}
            icon={activeTab === 'settings' ? <SettingsFilled style={{ fontSize: '48px' }} /> : <SettingsRegular style={{ fontSize: '48px' }} />}
          />
        </TabList>

        <Box className={styles.footer} sx={{ display: 'flex', flexDirection: 'column', gap: '20px', pb: '30px', alignItems: 'center' }}>
          <FluentButton 
            appearance="transparent" 
            icon={<SignOutRegular style={{ fontSize: '40px', opacity: 0.8 }} />} 
            onClick={handleLogout} 
          />
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box className={styles.mainArea}>
        {/* Background purple glow */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: -150, 
            right: -150, 
            width: 500, 
            height: 500, 
            borderRadius: '50%', 
            background: 'radial-gradient(circle, rgba(0, 120, 212, 0.1), transparent)', 
            filter: 'blur(80px)', 
            pointerEvents: 'none' 
          }} 
        />
        
        <Box className={styles.header}>
          <Title2 style={{ fontWeight: 800, letterSpacing: '-1px' }}>
            {selectedGame ? selectedGame.name : (activeTab === 'library' ? 'Thư viện' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1))}
          </Title2>

          {activeTab === 'library' && !selectedGame && (
            <TextField 
              size="small"
              placeholder="Tìm kiếm game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchRegular style={{ fontSize: 18, color: tokens.colorBrandForeground1 }} /></InputAdornment>,
                sx: { borderRadius: 1.5, width: 280, fontSize: '0.85rem', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: tokens.colorBrandStroke1 } }
              }}
            />
          )}
        </Box>

           <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 4, pt: 3, pb: 4, zIndex: 1 }}>
             <AnimatePresence mode="wait">
               {activeTab === 'library' && !selectedGame && (
                 <motion.div key="lib" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                   <Box sx={{ 
                     display: 'grid', 
                     gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                     gap: 3 
                   }}>
                     {filteredGames.map(game => (
                       <GameCard key={game.gid} game={game} onClick={() => setSelectedGame(game)} />
                     ))}
                     <AddGameButton onClick={() => { setAddDialogError(''); setOpenAddDialog(true); }} />
                   </Box>
                 </motion.div>
               )}

               {activeTab === 'library' && selectedGame && (
                 <motion.div key="details" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                   <Stack spacing={4}>
                       <FluentButton 
                         size="small" 
                         appearance="subtle"
                         icon={<HomeRegular style={{ fontSize: 16 }} />} 
                         onClick={() => setSelectedGame(null)} 
                         style={{ alignSelf: 'start', fontWeight: 700 }}
                       >
                         Về trang chủ
                       </FluentButton>

                      <Paper sx={{ p: 0, borderRadius: 2, overflow: 'hidden', position: 'relative', border: '1px solid rgba(139, 92, 246, 0.2)', boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
                        <Box sx={{ 
                          height: 340, 
                          background: 'linear-gradient(to top, #16161a 0%, rgba(22, 22, 26, 0.5) 100%)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'flex-end', 
                          p: 6, 
                          position: 'relative' 
                        }}>
                           <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%, rgba(139, 92, 246, 0.15), transparent)', zIndex: 0 }} />
                           
                           <Box sx={{ zIndex: 1 }}>
                             <Typography variant="h2" sx={{ fontWeight: 900, mb: 1, letterSpacing: '-2px' }}>{selectedGame.name}</Typography>
                             <Stack direction="row" spacing={3}>
                                <Chip icon={<Sync sx={{ fontSize: 16 }} />} label="Sync Enabled" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 700, borderRadius: 1.5, border: '1px solid rgba(16, 185, 129, 0.2)' }} />
                                <img src="/icon.ico" style={{ width: 16, height: 16, objectFit: 'contain', marginRight: '8px' }} alt="Rocket" />
                             </Stack>
                           </Box>
                           
                           <FluentButton 
                             appearance="primary"
                             size="large"
                             icon={launchingStatus ? null : <PlayRegular style={{ fontSize: 36 }} />}
                             onClick={(e) => {
                               e.stopPropagation();
                               handlePlay(selectedGame);
                             }}
                             disabled={!!launchingStatus}
                             className={styles.playButton}
                            >
                               {launchingStatus || "PLAY NOW"}
                            </FluentButton>
                        </Box>
                        {launchingStatus && <ProgressBar value={1} color="brand" />}
                      </Paper>

                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                        <ActionCard 
                          icon={<ArrowSyncRegular />} 
                          title="Đồng bộ thủ công" 
                          desc="Cập nhật dữ liệu lưu trữ lên Cloud ngay lập tức" 
                          onClick={() => handleSyncNow(selectedGame)}
                        />
                        <ActionCard 
                          icon={<FolderRegular />} 
                          title="Thư mục Game" 
                          desc="Mở thư mục cài đặt gốc của trò chơi này" 
                          onClick={() => handleBrowseFiles(selectedGame)}
                        />
                      </Box>
                   </Stack>
                 </motion.div>
               )}

               {activeTab === 'settings' && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                   <Tabs value={settingsTab} onChange={(_, v) => setSettingsTab(v)} sx={{ mb: 4 }}>
                     <Tab label="Tài khoản" />
                     <Tab label="Bộ nhớ" />
                     <Tab label="Phiên bản" />
                   </Tabs>

                   <Paper sx={{ p: 4, borderRadius: 2, bgcolor: 'background.paper' }}>
                     {settingsTab === 0 && (
                        <Stack spacing={3}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 1 }}>THÔNG TIN ĐĂNG NHẬP</Typography>
                          <SettingRow label="Email" val={session?.email} />
                          <SettingRow label="ID Người dùng" val={session?.id} />
                          <SettingRow label="Thời gian tham gia" val={new Date(session?.registered_at || '').toLocaleDateString('vi-VN')} />
                        </Stack>
                     )}
                     {settingsTab === 1 && (
                         <Stack spacing={3}>
                           <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 1 }}>BỘ NHỚ ĐÁM MÂY</Typography>
                           
                           <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
                               <Typography variant="h4" sx={{ fontWeight: 900 }}>
                                 {(games.length * 2.5).toFixed(1)}
                                 <Typography component="span" variant="body1" sx={{ fontWeight: 600, color: 'text.secondary', ml: 0.5 }}>/ 50 MB</Typography>
                               </Typography>
                               <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                 {((games.length * 2.5 / 50) * 100).toFixed(1)}% đã sử dụng
                               </Typography>
                             </Box>
                             <LinearProgress 
                               variant="determinate" 
                               value={Math.min((games.length * 2.5 / 50) * 100, 100)} 
                               sx={{ 
                                 height: 8, 
                                 borderRadius: 1, 
                                 bgcolor: 'rgba(255,255,255,0.05)',
                                 '& .MuiLinearProgress-bar': { 
                                   borderRadius: 1, 
                                   background: (games.length * 2.5 / 50) > 0.8 
                                     ? 'linear-gradient(90deg, #ef4444, #f97316)' 
                                     : 'linear-gradient(90deg, #8B5CF6, #A855F7)' 
                                 } 
                               }} 
                             />
                           </Box>

                           <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                           <Box>
                             <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 1, mb: 2, display: 'block' }}>CHI TIẾT DUNG LƯỢNG TỪNG GAME</Typography>
                             <Stack spacing={1}>
                               {games.length > 0 ? games.map(game => (
                                 <Box key={game.gid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                     <CloudQueue sx={{ fontSize: 18, color: 'primary.main', opacity: 0.7 }} />
                                     <Typography variant="body2" sx={{ fontWeight: 600 }}>{game.name}</Typography>
                                   </Box>
                                   <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>~2.5 MB</Typography>
                                 </Box>
                               )) : (
                                 <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>Chưa có game nào được đồng bộ</Typography>
                               )}
                             </Stack>
                           </Box>

                           <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                             <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700 }}>
                               💡 Giới hạn 50 MB / tài khoản. Liên hệ admin để nâng cấp dung lượng.
                             </Typography>
                           </Box>
                         </Stack>
                     )}
                     {settingsTab === 2 && (
                       <Box sx={{ textAlign: 'center', py: 4 }}>
                         <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3, bgcolor: 'primary.main', background: 'linear-gradient(45deg, #8B5CF6, #A855F7)' }}>
                           <Rocket sx={{ fontSize: 40 }} />
                         </Avatar>
                         <Typography variant="h5" sx={{ fontWeight: 900 }}>PLD Launcher v2.5</Typography>
                         <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>Premium Experience Design</Typography>
                         <Typography variant="caption" sx={{ opacity: 0.5 }}>Developed with the ultimate precision for gamers.</Typography>
                       </Box>
                     )}
                   </Paper>
                 </motion.div>
               )}
             </AnimatePresence>
           </Box>
        </Box>

        {/* Add Game Dialog */}
        <Dialog 
          open={openAddDialog} 
          onClose={() => setOpenAddDialog(false)} 
          PaperProps={{ 
            sx: { 
              borderRadius: 2, 
              width: 480, 
              bgcolor: '#1a1a1f',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
            } 
          }}
        >
          <DialogTitle sx={{ px: 3, pt: 3, pb: 0.5, fontWeight: 800, fontSize: '1.1rem' }}>Thêm Game Mới</DialogTitle>
          <DialogContent sx={{ px: 3, pt: 1, pb: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>Chọn file khởi chạy và thư mục lưu game để kích hoạt Cloud Sync.</Typography>
            
            {addDialogError && <Alert severity="error" sx={{ borderRadius: 1, bgcolor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)', py: 0, fontSize: '0.8rem' }}>{addDialogError}</Alert>}
            
            <TextField 
              fullWidth 
              size="small"
              label="Tên Trò Chơi" 
              placeholder="VD: Minecraft"
              value={newGame.name} 
              onChange={(e) => setNewGame({...newGame, name: e.target.value})} 
              InputProps={{ sx: { borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)', fontSize: '0.85rem' } }}
            />
            
            <Box>
              <Typography variant="caption" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem', letterSpacing: 0.5 }}><FileOpen sx={{ fontSize: 13 }} /> ĐƯỜNG DẪN FILE .EXE</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField fullWidth size="small" value={newGame.exe} disabled placeholder="Chưa chọn file..." InputProps={{ sx: { borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)', fontSize: '0.78rem' } }} />
                <Button variant="outlined" size="small" onClick={handleBrowseExe} sx={{ minWidth: 70, borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1, '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}>Chọn</Button>
              </Stack>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem', letterSpacing: 0.5 }}><FolderOpen sx={{ fontSize: 13 }} /> THƯ MỤC SAVE</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField fullWidth size="small" value={newGame.save_dir} disabled placeholder="Chưa chọn thư mục..." InputProps={{ sx: { borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)', fontSize: '0.78rem' } }} />
                <Button variant="outlined" size="small" onClick={handleBrowseSave} sx={{ minWidth: 70, borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1, '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}>Chọn</Button>
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5, gap: 1 }}>
            <Button onClick={() => setOpenAddDialog(false)} sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem', textTransform: 'none' }}>Huỷ</Button>
            <Button variant="contained" onClick={handleAddGame} sx={{ px: 3, py: 0.8, borderRadius: 1, background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'none', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)' } }}>Thêm game</Button>
          </DialogActions>
        </Dialog>
        </Box>
    );
};

// --- Helper Components ---

const SidebarItem: React.FC<{ active?: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <ListItemButton onClick={onClick} sx={{ borderRadius: 2, mb: 1, py: 1.2, bgcolor: active ? 'rgba(139, 92, 246, 0.12)' : 'transparent', '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.08)' }, position: 'relative' }}>
    {active && <Box sx={{ position: 'absolute', left: -4, top: '20%', bottom: '20%', width: 4, bgcolor: 'primary.main', borderRadius: 4 }} />}
    <ListItemIcon sx={{ color: active ? 'primary.main' : 'rgba(255,255,255,0.4)', minWidth: 40, transform: active ? 'scale(1.1)' : 'scale(1)', transition: '0.2s' }}>{icon}</ListItemIcon>
    <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: active ? 700 : 500, color: active ? 'white' : 'rgba(255,255,255,0.5)' }} />
  </ListItemButton>
);

const GameCard: React.FC<{ game: Game, onClick: () => void }> = ({ game, onClick }) => (
  <Card 
    onClick={onClick} 
    elevation={0} 
    sx={{ 
      borderRadius: 2, 
      bgcolor: tokens.colorNeutralBackground3, 
      border: `1px solid ${tokens.colorNeutralStroke1}`, 
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
      cursor: 'pointer', 
      overflow: 'hidden', 
      '&:hover': { 
        transform: 'translateY(-10px)', 
        borderColor: tokens.colorBrandStroke1, 
        boxShadow: tokens.shadow28,
        bgcolor: tokens.colorNeutralBackground3Hover
      }, 
      '&:active': { transform: 'scale(0.96)' } 
    }}
  >
    <Box sx={{ height: 180, background: `linear-gradient(45deg, ${tokens.colorNeutralBackground2}, ${tokens.colorNeutralBackground4})`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <Box sx={{ position: 'absolute', inset: 0, opacity: 0.1, background: `radial-gradient(circle, ${tokens.colorBrandBackground}, transparent)` }} />
       <img src="/icon.ico" style={{ width: 64, height: 64, opacity: 0.8, objectFit: 'contain' }} alt="Game Icon" />
    </Box>
    <CardContent sx={{ p: 2.5 }}>
      <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }} noWrap>{game.name}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.6 }}>PC DIGITAL EDITION</Typography>
    </CardContent>
  </Card>
);

const AddGameButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Box onClick={onClick} sx={{ height: 260, border: `2px dashed ${tokens.colorNeutralStroke1}`, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', '&:hover': { bgcolor: tokens.colorNeutralBackground1Hover, borderColor: tokens.colorBrandStroke1 } }}>
    <Box sx={{ mb: 2, display: 'flex' }}><img src="/icon.ico" style={{ width: 48, height: 48, objectFit: 'contain', filter: 'grayscale(1) opacity(0.5)' }} alt="Add" /></Box>
    <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.colorBrandForeground1 }}>Thêm Game Mới</Typography>
  </Box>
);

const ActionCard: React.FC<{ icon: React.ReactNode, title: string, desc: string, onClick?: () => void }> = ({ icon, title, desc, onClick }) => (
  <Paper 
    onClick={onClick}
    sx={{ 
      p: 3, 
      borderRadius: 2, 
      display: 'flex', 
      gap: 3, 
      alignItems: 'center', 
      cursor: onClick ? 'pointer' : 'default',
      transition: '0.3s',
      border: '1px solid rgba(255,255,255,0.03)',
      '&:hover': { bgcolor: '#1f1f25', transform: onClick ? 'translateY(-4px)' : 'none', borderColor: 'rgba(139, 92, 246, 0.2)' },
      '&:active': { transform: 'scale(0.98)' }
    }}
  >
    <Avatar sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', color: 'primary.main', borderRadius: 1.5, width: 52, height: 52 }}>
      {icon}
    </Avatar>
    <Box>
      <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>{desc}</Typography>
    </Box>
  </Paper>
);

const SettingRow: React.FC<{ label: string, val: any }> = ({ label, val }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
     <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>{label}</Typography>
     <Typography variant="body2" sx={{ fontWeight: 700 }}>{val}</Typography>
  </Box>
);

const StatCell: React.FC<{ label: string, val: any }> = ({ label, val }) => (
  <Box sx={{ textAlign: 'center' }}>
     <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>{val}</Typography>
     <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</Typography>
  </Box>
);

const Chip: React.FC<{ icon: React.ReactNode, label: string, size?: any, sx?: any }> = ({ icon, label, size, sx }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: 2, fontSize: '0.8rem', ...sx }}>
    {icon}
    {label}
  </Box>
);

export default App;
