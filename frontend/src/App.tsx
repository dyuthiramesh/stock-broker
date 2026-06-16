import { useAuth } from './context/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';

export function App() {
  const { token } = useAuth();
  return token ? <Dashboard /> : <LoginForm />;
}
