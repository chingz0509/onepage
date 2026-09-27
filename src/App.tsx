import { useHashPath } from './router'
import { Landing } from './pages/Landing'
import { Create } from './pages/Create'
import { PublicPage } from './pages/PublicPage'

export default function App() {
  const path = useHashPath()

  if (path.startsWith('/p/')) {
    // hash 路由下 query 在 hash 内部：#/p/<slug>?d=<encoded>
    const rest = path.slice(3)
    const q = rest.indexOf('?')
    const slug = q === -1 ? rest : rest.slice(0, q)
    const params = new URLSearchParams(q === -1 ? '' : rest.slice(q + 1))
    return <PublicPage slug={slug} encoded={params.get('d')} />
  }
  if (path.startsWith('/create')) {
    return <Create />
  }
  return <Landing />
}
