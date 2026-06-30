export type Experience = 'beginner0' | 'beginner1' | 'inter' | 'advanced' | 'pro'
export type Visibility = 'public' | 'friends' | 'private'
export type FriendshipStatus = 'pending' | 'accepted'

export interface Profile {
  id: string
  display_name: string
  experience: Experience
  recording_count: number
  created_at: string
}

export interface PracticeSession {
  id: string
  user_id: string
  date: string
  duration_sec: number
  piece: string | null
  note: string | null
  created_at: string
}

export interface Recording {
  id: string
  user_id: string
  piece: string
  note: string | null
  visibility: Visibility
  duration_sec: number
  audio_path: string
  level_n: number
  level_title: string
  experience: Experience
  created_at: string
  profiles?: Profile
}

export interface Comment {
  id: string
  recording_id: string
  user_id: string
  text: string
  created_at: string
  profiles?: Profile
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      practice_sessions: {
        Row: PracticeSession
        Insert: Omit<PracticeSession, 'id' | 'created_at'>
        Update: Partial<Omit<PracticeSession, 'id' | 'created_at'>>
      }
      recordings: {
        Row: Recording
        Insert: Omit<Recording, 'id' | 'created_at' | 'profiles'>
        Update: Partial<Omit<Recording, 'id' | 'created_at' | 'profiles'>>
      }
      comments: {
        Row: Comment
        Insert: { recording_id: string; user_id: string; text: string }
        Update: Partial<{ text: string }>
      }
    }
  }
}
