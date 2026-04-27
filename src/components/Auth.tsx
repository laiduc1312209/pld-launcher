import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Container, 
  Paper, 
  Avatar, 
  IconButton, 
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  createTheme,
  ThemeProvider,
  CssBaseline,
  Checkbox,
  FormControlLabel,
  Link
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff,
  GitHub as GitHubIcon,
  Login as LoginIcon,
  RocketLaunchOutlined as Rocket
} from '@mui/icons-material';
import { 
  Button as FluentButton, 
  Avatar as FluentAvatar,
  tokens
} from '@fluentui/react-components';
import { WindowConsoleRegular } from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface AuthProps {
  onLogin: (user: any) => void;
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8B5CF6',
      dark: '#7C3AED',
      light: '#A78BFA',
    },
    background: {
      default: '#0a0a0c',
      paper: '#16161a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 12,
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #8B5CF6 30%, #A855F7 90%)',
          boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.39)',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(139, 92, 246, 0.5)' },
          }
        }
      }
    }
  }
});

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('Mật khẩu nhập lại không khớp');
        setIsSubmitting(false);
        return;
      }
      if (!agreedToTerms) {
        setError('Bạn phải đồng ý với điều khoản sử dụng');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (isRegistering) {
        await invoke('register', { username, email, password });
        setSuccess('Đăng ký thành công! Hãy đăng nhập ngay.');
        setIsRegistering(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        const user = await invoke('login', { username, password });
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          minHeight: '100vh', 
          width: '100vw', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.default',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'absolute', top: -150, left: -150, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -150, right: -150, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent)', filter: 'blur(100px)', pointerEvents: 'none' }} />

        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Container maxWidth="xs">
            <Paper 
              elevation={0}
              sx={{ 
                p: isRegistering ? 3 : 4, 
                borderRadius: 6, 
                bgcolor: 'rgba(22, 22, 26, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease'
              }}
            >
              <Box sx={{ mb: isRegistering ? 2 : 3, textAlign: 'center' }}>
                <img 
                  src="/icon.ico" 
                  style={{ 
                    width: isRegistering ? 56 : 72, 
                    height: isRegistering ? 56 : 72, 
                    margin: '0 auto 16px',
                    display: 'block',
                    objectFit: 'contain'
                  }} 
                  alt="Logo" 
                />
                <Typography variant={isRegistering ? "h6" : "h5"} sx={{ fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
                  {isRegistering ? 'Đăng Ký' : 'Đăng Nhập'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
                  {isRegistering ? 'Tham gia cộng đồng PLD Launcher' : 'Sử dụng tài khoản PLD Launcher'}
                </Typography>
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.1)', py: 0 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ width: '100%', mb: 2, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.1)', py: 0 }}>
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                {isRegistering && (
                  <TextField
                    fullWidth
                    label="Email"
                    variant="outlined"
                    type="email"
                    required
                    size="small"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{ mb: 1.5 }}
                  />
                )}

                <TextField
                  fullWidth
                  label={isRegistering ? "Tên đăng nhập" : "Tên đăng nhập / Email"}
                  variant="outlined"
                  required
                  size={isRegistering ? "small" : "medium"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                
                <TextField
                  fullWidth
                  label="Mật khẩu"
                  variant="outlined"
                  type={showPassword ? 'text' : 'password'}
                  required
                  size={isRegistering ? "small" : "medium"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{ mb: isRegistering ? 1.5 : 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff sx={{ fontSize: 18, color: 'primary.main' }} /> : <Visibility sx={{ fontSize: 18, color: 'primary.main' }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {isRegistering && (
                  <>
                    <TextField
                      fullWidth
                      label="Nhập lại mật khẩu"
                      variant="outlined"
                      type={showPassword ? 'text' : 'password'}
                      required
                      size="small"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox 
                          size="small" 
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          sx={{ color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: 'primary.main' } }}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Tôi đồng ý với <Link href="#" sx={{ color: 'primary.light', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Điều khoản sử dụng</Link>
                        </Typography>
                      }
                      sx={{ mb: 1.5 }}
                    />
                  </>
                )}

                <FluentButton
                  type="submit"
                  appearance="primary"
                  fullWidth
                  size="large"
                  disabled={isSubmitting}
                  style={{ 
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  {isSubmitting ? 'ĐANG XỬ LÝ...' : (isRegistering ? 'TẠO TÀI KHOẢN' : 'ĐĂNG NHẬP')}
                </FluentButton>
                
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  {!isRegistering && <Button variant="text" size="small" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Quên mật khẩu?</Button>}
                  <Button 
                    variant="text" 
                    size="small" 
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError('');
                      setSuccess('');
                    }}
                    sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.75rem', ml: isRegistering ? 'auto' : 0, mr: isRegistering ? 'auto' : 0 }}
                  >
                    {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Đăng ký tài khoản'}
                  </Button>
                </Stack>
              </Box>
            </Paper>
            
            <Typography variant="caption" sx={{ mt: 2, display: 'block', textAlign: 'center', opacity: 0.5, fontWeight: 700, letterSpacing: 1 }}>
              PLD LAUNCHER v2.5 PREVIEW
            </Typography>
          </Container>
        </motion.div>
      </Box>
    </ThemeProvider>
  );
};

export default Auth;
