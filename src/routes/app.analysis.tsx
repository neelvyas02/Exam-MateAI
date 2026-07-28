import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, FileSearch, Layers, Repeat } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,

  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/analysis")({
  head: () => ({
    meta: [
      { title: "Question Paper Analysis — ExamMate AI" },
      {
        name: "description",
        content: "Repeated questions, unit-wise weightage and topic frequency across previous year papers.",
      },
      { property: "og:title", content: "Question Paper Analysis — ExamMate AI" },
      {
        property: "og:description",
        content: "Repeated questions, unit-wise weightage and topic frequency across previous year papers.",
      },
    ],
  }),
  component: AnalysisPage,
});

// Placeholder data for UI demonstration only.
const repeatedQuestions = [
  { q: "Explain deadlock detection and recovery with a suitable example.", years: ["2022", "2023", "2024"] },
  { q: "Compare paging and segmentation with diagrams.", years: ["2021", "2024"] },
  { q: "Describe the working of the LRU page replacement algorithm.", years: ["2022", "2024"] },
  { q: "What is a critical section? Explain Peterson's solution.", years: ["2021", "2023"] },
];

const topicFrequency = [
  { topic: "Deadlocks", count: 9 },
  { topic: "Scheduling", count: 8 },
  { topic: "Memory Mgmt", count: 7 },
  { topic: "File Systems", count: 4 },
  { topic: "Synchronization", count: 6 },
  { topic: "I/O Systems", count: 3 },
];

const unitWeightage = [
  { unit: "Unit 1", marks: 18 },
  { unit: "Unit 2", marks: 26 },
  { unit: "Unit 3", marks: 22 },
  { unit: "Unit 4", marks: 14 },
  { unit: "Unit 5", marks: 20 },
];

const chartConfig = {
  count: { label: "Times asked", color: "var(--chart-1)" },
  marks: { label: "Marks", color: "var(--chart-2)" },
};

const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function AnalysisPage() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <PageHeader
        icon={FileSearch}
        title="Question Paper Analysis"
        description="Patterns detected across the previous year papers in your workspace. Placeholder values shown."
        actions={
          <>
            <Button
              className="rounded-xl"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1300);
              }}
            >
              {loading ? "Re-analyzing…" : "Re-run analysis"}
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/app/papers">Manage papers</Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="repeated">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
          <TabsTrigger value="repeated" className="rounded-lg">
            Repeated questions
          </TabsTrigger>
          <TabsTrigger value="frequency" className="rounded-lg">
            Topic frequency
          </TabsTrigger>
          <TabsTrigger value="units" className="rounded-lg">
            Unit-wise analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repeated" className="mt-5">
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Repeat className="h-4 w-4 text-primary" /> Questions that keep coming back
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                : repeatedQuestions.map((r) => (
                    <div
                      key={r.q}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-accent/40"
                    >
                      <p className="min-w-0 text-sm font-medium">{r.q}</p>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {r.years.map((y) => (
                          <Badge key={y} variant="secondary" className="rounded-full text-[11px]">
                            {y}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frequency" className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Topic frequency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <BarChart data={topicFrequency} margin={{ left: -18 }}>
                  <CartesianGrid vertical={false} strokeOpacity={0.25} />
                  <XAxis dataKey="topic" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-18} dy={10} height={50} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Share of questions by topic</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={topicFrequency} dataKey="count" nameKey="topic" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {topicFrequency.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="mt-5">
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" /> Unit-wise marks distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-80 w-full">
                <BarChart data={unitWeightage} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} strokeOpacity={0.25} />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis dataKey="unit" type="category" tickLine={false} axisLine={false} fontSize={12} width={70} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="marks" fill="var(--color-marks)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
