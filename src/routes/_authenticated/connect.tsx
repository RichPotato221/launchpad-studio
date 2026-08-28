import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, ExternalLink, Plug } from "lucide-react";

export const Route = createFileRoute("/_authenticated/connect")({
  head: () => ({
    meta: [
      { title: "Connect an AI Assistant — TRoGKC Portal" },
      {
        name: "description",
        content:
          "Step-by-step instructions for connecting ChatGPT, Claude or another AI assistant to the TRoGKC Leadership Portal.",
      },
      { property: "og:title", content: "Connect an AI Assistant — TRoGKC Portal" },
      {
        property: "og:description",
        content: "Link ChatGPT, Claude or Claude Code to the TRoGKC Leadership Portal in a few clicks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectPage,
});

const APP_NAME = "TRoGKC Leadership Portal";
const SERVER_SLUG = "trog-leadership-portal";

const OWNER_EMAIL = "richardmashaba.sog@gmail.com";

function ConnectPage() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    setUrl(new URL("/mcp", window.location.origin).toString());
    getAuthUserResult().then(({ data }) => {
      setAllowed((data.user?.email ?? "").toLowerCase() === OWNER_EMAIL);
    });
  }, []);

  const command = `claude mcp add --scope user --transport http ${SERVER_SLUG} '${url}'`;

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const chatgptLink =
    "https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins";
  const claudeLink = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(
    APP_NAME,
  )}&connectorUrl=${encodeURIComponent(url)}`;

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-2">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Agent integrations</p>
        <h1 className="flex items-center gap-3 font-serif text-3xl">
          <Plug className="h-7 w-7 text-primary" />
          Connect an AI assistant to the portal
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          You can let ChatGPT, Claude or another AI assistant work with the portal directly — asking it about
          upcoming events, event process orders and readiness, and letting it update ministry activities on your
          behalf. It signs in as you, so it only ever sees what you are allowed to see.
        </p>
      </header>

      <Card className="space-y-3 p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Portal connection address</p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 break-all rounded-md border bg-muted/50 px-4 py-3 font-mono text-sm">
            {url || "Loading…"}
          </code>
          <Button onClick={() => copy(url, "url")} disabled={!url}>
            {copied === "url" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied === "url" ? "Copied" : "Copy address"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Copy this address — every set of instructions below asks you to paste it in.
        </p>
      </Card>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Set up the connection</h2>
        <Tabs defaultValue="chatgpt">
          <TabsList>
            <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
            <TabsTrigger value="claude">Claude</TabsTrigger>
            <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
            <TabsTrigger value="other">Other assistants</TabsTrigger>
          </TabsList>

          <TabsContent value="chatgpt">
            <Card className="space-y-4 p-6">
              <Steps
                items={[
                  <>
                    Open{" "}
                    <Ext href="https://chatgpt.com/#settings/Connectors/Advanced">ChatGPT's advanced connector
                    settings</Ext>{" "}
                    and switch on Developer mode, reading the risk notice ChatGPT shows there. If you cannot see
                    Developer mode, ask whoever administers your ChatGPT workspace to enable it.
                  </>,
                  <>
                    Open the <Ext href={chatgptLink}>New plugin dialog</Ext>.
                  </>,
                  <>
                    Type <strong>{APP_NAME}</strong> as the name and paste the connection address above into the URL
                    field.
                  </>,
                  <>
                    Review the details, tick <em>“I understand and want to continue”</em> — ChatGPT shows that warning
                    for every custom connection, not just this one — then click <strong>Create</strong>.
                  </>,
                  <>Turn the portal on from the chat box, then ask ChatGPT to use it.</>,
                ]}
              />
            </Card>
          </TabsContent>

          <TabsContent value="claude">
            <Card className="space-y-4 p-6">
              <Steps
                items={[
                  <>
                    Open the <Ext href={claudeLink}>Add connector dialog in Claude</Ext> — the name and address are
                    filled in for you.
                  </>,
                  <>
                    Check the details and click <strong>Add</strong>.
                  </>,
                  <>
                    If the dialog does not open with the details filled in, go to Claude's Connectors page, choose
                    <strong> Add custom connector</strong>, name it <strong>{APP_NAME}</strong> and paste the address
                    above.
                  </>,
                  <>Switch the connector on from the chat box, then ask Claude to use the portal.</>,
                ]}
              />
            </Card>
          </TabsContent>

          <TabsContent value="claude-code">
            <Card className="space-y-4 p-6">
              <Steps
                items={[
                  <>Run this one line in a terminal:</>,
                  <>
                    Start Claude Code and run <code className="rounded bg-muted px-1.5 py-0.5">/mcp</code> to confirm
                    the portal is connected. It will ask you to sign in there.
                  </>,
                  <>Ask Claude Code to use the portal.</>,
                ]}
              />
              <div className="flex flex-wrap items-center gap-3">
                <code className="flex-1 break-all rounded-md border bg-muted/50 px-4 py-3 font-mono text-xs">
                  {command}
                </code>
                <Button variant="outline" onClick={() => copy(command, "cmd")} disabled={!url}>
                  {copied === "cmd" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied === "cmd" ? "Copied" : "Copy command"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="other">
            <Card className="space-y-4 p-6">
              <Steps
                items={[
                  <>Open your assistant's connector or server settings.</>,
                  <>Create a new remote connection.</>,
                  <>
                    Name it <strong>{APP_NAME}</strong> and paste the connection address above.
                  </>,
                  <>Complete any sign-in or approval prompts.</>,
                  <>Enable the connection, then ask the assistant to use the portal.</>,
                ]}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Refresh after the portal is updated</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Assistants remember what the portal could do at the moment you connected. When new capability is added
          here, refresh the connection so your assistant picks it up.
        </p>
        <Tabs defaultValue="chatgpt-r">
          <TabsList>
            <TabsTrigger value="chatgpt-r">ChatGPT</TabsTrigger>
            <TabsTrigger value="claude-r">Claude</TabsTrigger>
            <TabsTrigger value="claude-code-r">Claude Code</TabsTrigger>
            <TabsTrigger value="other-r">Other assistants</TabsTrigger>
          </TabsList>

          <TabsContent value="chatgpt-r">
            <Card className="p-6">
              <Steps
                items={[
                  <>Open ChatGPT's Plugins page and select the portal.</>,
                  <>
                    Scroll to <strong>Information</strong> and click <strong>Refresh</strong>.
                  </>,
                  <>
                    ChatGPT cannot change a saved address — if the address above has changed, delete the entry and set
                    it up again.
                  </>,
                  <>Start a new chat and ask ChatGPT to use the portal.</>,
                ]}
              />
            </Card>
          </TabsContent>

          <TabsContent value="claude-r">
            <Card className="p-6">
              <Steps
                items={[
                  <>Open the Connectors page and select the portal.</>,
                  <>Refresh or update its tools.</>,
                  <>
                    Claude cannot change a saved address — if the address above has changed, remove the connector and
                    add it again.
                  </>,
                  <>Ask Claude to use the portal.</>,
                ]}
              />
            </Card>
          </TabsContent>

          <TabsContent value="claude-code-r">
            <Card className="p-6">
              <Steps
                items={[
                  <>Start a new Claude Code session — it picks up the latest capability when it connects.</>,
                  <>
                    If the address changed, run{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5">claude mcp remove {SERVER_SLUG}</code> and run the
                    install command again.
                  </>,
                  <>Ask Claude Code to use the portal.</>,
                ]}
              />
            </Card>
          </TabsContent>

          <TabsContent value="other-r">
            <Card className="p-6">
              <Steps
                items={[
                  <>Open your assistant's connector settings.</>,
                  <>Select the connection you created for the portal.</>,
                  <>Refresh its tools, reload it, or reconnect.</>,
                  <>If the address changed, paste the latest one from above.</>,
                  <>Start a new chat and ask the assistant to use the portal.</>,
                ]}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
            {i + 1}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
