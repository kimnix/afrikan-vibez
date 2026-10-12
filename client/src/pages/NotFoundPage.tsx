import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'

export function NotFoundPage() {
  return (
    <Container className="flex min-h-[60svh] flex-col items-center justify-center py-24 text-center">
      <p className="gold-text font-display text-6xl font-extrabold">404</p>
      <h1 className="mt-4 text-3xl font-bold text-cream">Page not found</h1>
      <p className="mt-3 max-w-md text-subtle">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button to="/">Back home</Button>
        <Button to="/events" variant="glass">
          Browse events
        </Button>
      </div>
    </Container>
  )
}
