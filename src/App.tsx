import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { RecordPage } from './pages/RecordPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/record" element={<RecordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
