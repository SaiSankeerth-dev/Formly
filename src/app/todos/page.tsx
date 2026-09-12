import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Supabase Integration</h1>
        <p className="text-sm text-gray-500">
          Supabase cloud backend is optional. The application uses authoritative in-memory / PGlite PostgreSQL. To connect a remote database, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </p>
      </div>
    );
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Todos</h1>
      <ul className="space-y-2">
        {todos && todos.length > 0 ? (
          todos.map((todo: any) => (
            <li key={todo.id} className="p-3 bg-white rounded border shadow-sm flex items-center justify-between">
              <span>{todo.name || todo.title || JSON.stringify(todo)}</span>
              {todo.id && <span className="text-xs text-gray-400">ID: {todo.id}</span>}
            </li>
          ))
        ) : (
          <li className="text-gray-500 italic">No todos found in Supabase 'todos' table yet.</li>
        )}
      </ul>
    </div>
  )
}
