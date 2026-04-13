import { getStudents, getPersonnel, getPayments, getAttendance, CLASSES } from "@/lib/store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from "recharts";

const COLORS = ["oklch(0.72 0.14 220)", "oklch(0.65 0.15 180)", "oklch(0.78 0.16 75)", "oklch(0.60 0.12 280)", "oklch(0.577 0.245 27.325)"];

export function StatistiquesModule() {
  const students = getStudents();
  const personnel = getPersonnel();
  const payments = getPayments();
  const attendance = getAttendance();

  // Students per class
  const classeData = CLASSES.map((c) => ({
    classe: c,
    count: students.filter((s) => s.classe === c).length,
  })).filter((d) => d.count > 0);

  // Payments status
  const paymentStatus = [
    { name: "Payés", value: payments.filter((p) => p.status === "payé").length },
    { name: "Impayés", value: payments.filter((p) => p.status === "impayé").length },
    { name: "Partiels", value: payments.filter((p) => p.status === "partiel").length },
  ].filter((d) => d.value > 0);

  // Personnel type
  const personnelType = [
    { name: "Enseignants", value: personnel.filter((p) => p.type === "enseignant").length },
    { name: "Surveillants", value: personnel.filter((p) => p.type === "surveillant").length },
  ].filter((d) => d.value > 0);

  // Attendance rate
  const totalPresent = attendance.filter((a) => a.present).length;
  const totalAbsent = attendance.filter((a) => !a.present).length;
  const attendanceRate = attendance.length > 0 ? Math.round((totalPresent / attendance.length) * 100) : 0;

  // Monthly inscriptions
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2025, i).toLocaleDateString("fr-FR", { month: "short" });
    const count = students.filter((s) => new Date(s.dateInscription).getMonth() === i).length;
    return { month, inscriptions: count };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Statistiques</h2>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border text-center">
          <p className="text-sm text-muted-foreground">Élèves</p>
          <p className="text-3xl font-bold text-primary">{students.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border text-center">
          <p className="text-sm text-muted-foreground">Personnel</p>
          <p className="text-3xl font-bold text-accent">{personnel.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border text-center">
          <p className="text-sm text-muted-foreground">Paiements</p>
          <p className="text-3xl font-bold text-success">{payments.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border text-center">
          <p className="text-sm text-muted-foreground">Taux Présence</p>
          <p className="text-3xl font-bold text-warning">{attendanceRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Students per class */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="font-semibold mb-4">Élèves par classe</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={classeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.015 220)" />
              <XAxis dataKey="classe" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="oklch(0.72 0.14 220)" radius={[6, 6, 0, 0]} name="Élèves" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment status pie */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="font-semibold mb-4">Statut des Paiements</h3>
          {paymentStatus.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={paymentStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                  {paymentStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 justify-center text-xs mt-2">
            {paymentStatus.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        {/* Monthly inscriptions */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border lg:col-span-2">
          <h3 className="font-semibold mb-4">Évolution des Inscriptions</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gradInscr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.14 220)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.72 0.14 220)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.015 220)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="inscriptions" stroke="oklch(0.72 0.14 220)" fill="url(#gradInscr)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
