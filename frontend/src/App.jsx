import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadConsole from './pages/UploadConsole';
import DraftBuilder from './pages/DraftBuilder';
import EditArticle from './pages/EditArticle';
import ViewerPage from './pages/ViewerPage';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <PrivateRoute>
            <Navbar />
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<UploadConsole />} />
              <Route path="/draft/:id" element={<DraftBuilder />} />
              <Route path="/edit/:id" element={<EditArticle />} />
              <Route path="/viewer" element={<ViewerPage />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}