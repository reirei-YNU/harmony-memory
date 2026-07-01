import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useGroup } from './context/GroupContext'
import { firebaseConfigured } from './firebase'
import { LoginPage } from './pages/LoginPage'
import { GroupPage } from './pages/GroupPage'
import { HomePage } from './pages/HomePage'
import { RecordPage } from './pages/RecordPage'

function FirebaseSetupNotice() {
  return (
    <div className="page page--centered">
      <div className="card auth-card">
        <h1>設定が必要です</h1>
        <p>
          Firebase の設定が見つかりません。<code>.env.example</code> を
          <code>.env</code> にコピーし、Firebase プロジェクトの値を入力してください。
        </p>
      </div>
    </div>
  )
}

export function App() {
  const { user, loading: authLoading } = useAuth()
  const { activeGroup, loading: groupLoading } = useGroup()

  if (!firebaseConfigured) {
    return <FirebaseSetupNotice />
  }

  if (authLoading) {
    return <div className="page page--centered">読み込み中...</div>
  }

  if (!user) {
    return <LoginPage />
  }

  if (groupLoading) {
    return <div className="page page--centered">読み込み中...</div>
  }

  if (!activeGroup) {
    return <GroupPage />
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/record" element={<RecordPage />} />
      <Route path="/group" element={<GroupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
