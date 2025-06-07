import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 chat-widget">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Chat Widget</CardTitle>
          <CardDescription>
            shadcn/ui setup complete! ✅
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full">
            Start Chat
          </Button>
          <p className="text-sm text-muted-foreground">
            Step 1 complete - Ready to build chat components!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default App 