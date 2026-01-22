import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import Profile from '@/pages/Profile';
import Novels from '@/pages/Novels';
import NovelDetail from '@/pages/NovelDetail';
import CreateNovel from '@/pages/CreateNovel';
import EditNovel from '@/pages/EditNovel';
import ChapterEditor from '@/pages/ChapterEditor';
import StorylineManager from '@/pages/StorylineManager';
import Chat from '@/pages/Chat';

function App() {
    const { initializeAuth, isLoading } = useAuthStore();

    useEffect(() => {
        // 应用启动时初始化认证状态
        initializeAuth();
    }, [initializeAuth]);

    // 如果正在初始化认证状态，显示加载页面
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">正在加载...</p>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <Toaster 
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: '#4ade80',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        duration: 5000,
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            <Routes>
                {/* 公开路由 */}
                <Route 
                    path="/login" 
                    element={
                        <ProtectedRoute requireAuth={false}>
                            <Login />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/register" 
                    element={
                        <ProtectedRoute requireAuth={false}>
                            <Register />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/forgot-password" 
                    element={
                        <ProtectedRoute requireAuth={false}>
                            <ForgotPassword />
                        </ProtectedRoute>
                    } 
                />
                {/* 需要认证的路由 */}
                <Route 
                    path="/" 
                    element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/profile" 
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/chat" 
                    element={
                        <ProtectedRoute>
                            <Chat />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/novels" 
                    element={
                        <ProtectedRoute>
                            <Novels />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/novels/create" 
                    element={
                        <ProtectedRoute>
                            <CreateNovel />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/novels/:id" 
                    element={
                        <ProtectedRoute>
                            <NovelDetail />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/novels/:id/edit" 
                    element={
                        <ProtectedRoute>
                            <EditNovel />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/novels/:novelId/storylines" 
                    element={
                        <ProtectedRoute>
                            <StorylineManager />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/novels/:novelId/chapters/create" 
                    element={
                        <ProtectedRoute>
                            <ChapterEditor />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/novels/:novelId/chapters/:chapterId" 
                    element={
                        <ProtectedRoute>
                            <ChapterEditor />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/novels/:novelId/chapters/:chapterId/edit" 
                    element={
                        <ProtectedRoute>
                            <ChapterEditor />
                        </ProtectedRoute>
                    } 
                />
            </Routes>
        </Router>
    );
}

export default App;