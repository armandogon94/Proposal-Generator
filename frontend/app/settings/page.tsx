"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Company Name</Label>
              <Input defaultValue="305 AI" disabled />
            </div>
            <div>
              <Label>Website</Label>
              <Input defaultValue="305-ai.com" disabled />
            </div>
            <div>
              <Label>Email</Label>
              <Input defaultValue="hello@305-ai.com" disabled />
            </div>
            <div>
              <Label>Phone</Label>
              <Input placeholder="+1-XXX-XXX-XXXX" disabled />
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded" style={{ backgroundColor: "#1E40AF" }} />
                <Input defaultValue="#1E40AF" disabled />
              </div>
            </div>
            <div>
              <Label>Secondary Color</Label>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded" style={{ backgroundColor: "#0369A1" }} />
                <Input defaultValue="#0369A1" disabled />
              </div>
            </div>
            <div>
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded" style={{ backgroundColor: "#FB923C" }} />
                <Input defaultValue="#FB923C" disabled />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Branding is configured via environment variables. Edit .env to customize.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Model Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Default Model (Drafts)</Label>
              <Input defaultValue="Claude Haiku 4.5" disabled />
              <p className="mt-1 text-xs text-gray-500">~$0.02 per proposal</p>
            </div>
            <div>
              <Label>Enhanced Model (Refinements)</Label>
              <Input defaultValue="Claude Sonnet 4.6" disabled />
              <p className="mt-1 text-xs text-gray-500">~$0.06 per proposal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Default Payment Terms</Label>
              <Input defaultValue="Net 30" disabled />
            </div>
            <div>
              <Label>Proposal Validity (days)</Label>
              <Input type="number" defaultValue="30" disabled />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Settings management will be editable in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
