import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { AuthContextProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { DataRefreshProvider } from './context/DataRefreshContext';
import DataRefreshWrapper from './components/ui/DataRefreshWrapper';
import { PermissionProvider } from './hooks/usePermissions';

function App() {
  return (
    <BrowserRouter>
      <AuthContextProvider>
        <BranchProvider>
          <PermissionProvider>
            <DataRefreshProvider>
              <DataRefreshWrapper>
                <AppRoutes />
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: '#1a1a2e',
                      color: '#fff',
                      border: '1px solid #d4af37',
                      borderRadius: '12px',
                      padding: '16px',
                    },
                    success: {
                      iconTheme: { primary: '#d4af37', secondary: '#1a1a2e' },
                      duration: 3000,
                    },
                    error: { duration: 4000 },
                    loading: { duration: 2000 },
                  }}
                />
              </DataRefreshWrapper>
            </DataRefreshProvider>
          </PermissionProvider>
        </BranchProvider>
      </AuthContextProvider>
    </BrowserRouter>
  );
}

export default App;