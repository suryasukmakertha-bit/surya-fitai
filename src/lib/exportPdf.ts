import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DayPlan {
  day: string;
  exercises: {
    name: string;
    sets: string;
    reps: string;
    rest: string;
    tempo?: string;
    cues?: string;
    alternative?: string;
    estimatedTimeMinutes?: number;
    weight_kg?: string;
    notes?: string;
  }[];
}

interface MealPlan {
  meal: string;
  time?: string;
  foods: string[];
  calories: number;
}

interface PlanData {
  programOverview?: string;
  warmUp?: string;
  coolDown?: string;
  weeklySplit?: string[];
  estimatedSessionTimeMinutes?: number;
  progressionRules?: string;
  deloadWeek?: string;
  recoveryTips?: string;
  warnings?: string[];
  workout_plan: DayPlan[];
  meal_plan: MealPlan[];
  calorie_target: number;
  protein: number;
  carbs: number;
  fat: number;
  water_liters: number;
  safety_notes: string[];
  motivational_message: string;
  grocery_list: string[];
  estimated_calories_burned: number;
  weight_projection: string;
}

export function exportPlanToPDF(plan: PlanData, programType?: string, userName?: string) {
  const doc = new jsPDF();
  const green = [57, 255, 20] as const;
  const darkBg = [20, 20, 20] as const;
  let y = 20;

  const checkPage = (need: number) => {
    if (y > 280 - need) { doc.addPage(); y = 20; }
  };

  // ── Header ──
  doc.setFontSize(24);
  doc.setTextColor(...green);
  doc.text("Surya-FitAi", 14, y);
  doc.setFontSize(12);
  doc.setTextColor(150, 150, 150);
  const pType = (programType || "Custom").charAt(0).toUpperCase() + (programType || "custom").slice(1);
  doc.text(`${pType} Program`, 14, y + 9);
  if (userName) doc.text(`Prepared for: ${userName}`, 14, y + 16);
  y += userName ? 26 : 18;

  // ── Macros Summary ──
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Daily Target: ${plan.calorie_target} kcal  |  Protein: ${plan.protein}g  |  Carbs: ${plan.carbs}g  |  Fat: ${plan.fat}g  |  Water: ${plan.water_liters}L`, 14, y);
  y += 8;

  // ── Session Time Banner ──
  if (plan.estimatedSessionTimeMinutes) {
    doc.setFillColor(230, 255, 230);
    doc.roundedRect(14, y - 3, 182, 10, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(30, 120, 30);
    doc.text(`✅ Session time: ${plan.estimatedSessionTimeMinutes} min (5 min warm-up + lifting + 5 min cool-down)`, 18, y + 4);
    y += 14;
  }

  // ── Program Overview ──
  if (plan.programOverview) {
    checkPage(20);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(plan.programOverview, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 6;
  }

  // ── Warm-Up ──
  if (plan.warmUp) {
    checkPage(20);
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text("🔥 Warm-Up", 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(plan.warmUp, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 6;
  }

  // ── Workout Plan — Full Detail ──
  if (plan.workout_plan?.length) {
    checkPage(14);
    doc.setFontSize(14);
    doc.setTextColor(...green);
    doc.text("Workout Plan", 14, y);
    y += 6;

    for (const day of plan.workout_plan) {
      checkPage(30);
      // Day header
      doc.setFontSize(11);
      doc.setTextColor(...green);
      doc.text(day.day, 14, y);
      y += 5;

      for (const ex of day.exercises) {
        checkPage(35);
        // Exercise name bar
        doc.setFillColor(35, 35, 35);
        doc.roundedRect(14, y - 3.5, 182, 7, 1, 1, "F");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(ex.name, 16, y + 1);
        const meta = `${ex.sets} × ${ex.reps}  |  Rest: ${ex.rest}${ex.tempo ? `  |  Tempo: ${ex.tempo}` : ""}`;
        doc.setFontSize(8);
        doc.setTextColor(200, 200, 200);
        const metaW = doc.getTextWidth(meta);
        doc.text(meta, 194 - metaW, y + 1);
        y += 6;

        // Weight recommendation
        if (ex.weight_kg) {
          doc.setFontSize(8);
          doc.setTextColor(57, 200, 20);
          doc.text(`🏋️ ${ex.weight_kg}`, 16, y);
          y += 4;
        }

        // Coaching cues / instructions
        if (ex.cues) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          const cueLines = doc.splitTextToSize(`💡 ${ex.cues}`, 176);
          doc.text(cueLines, 16, y);
          y += cueLines.length * 3.5;
        }

        // Alternative exercise
        if (ex.alternative) {
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(`↔ Alternative: ${ex.alternative}`, 16, y);
          y += 3.5;
        }

        // Notes
        if (ex.notes) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          const noteLines = doc.splitTextToSize(`📝 ${ex.notes}`, 176);
          doc.text(noteLines, 16, y);
          y += noteLines.length * 3.5;
        }

        y += 3; // spacing between exercises
      }
      y += 4; // spacing between days
    }
  }

  // ── Cool-Down ──
  if (plan.coolDown) {
    checkPage(20);
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text("🧘 Cool-Down", 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(plan.coolDown, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 6;
  }

  // ── Meal Plan ──
  if (plan.meal_plan?.length) {
    checkPage(20);
    doc.setFontSize(14);
    doc.setTextColor(...green);
    doc.text("Meal Plan", 14, y);
    y += 4;

    const mealRows = plan.meal_plan.map((m) => [
      m.meal + (m.time ? `\n${m.time}` : ""),
      m.foods.join(", "),
      `${m.calories} kcal`,
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Meal", "Foods", "Calories"]],
      body: mealRows,
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30], textColor: green as any, fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
      columnStyles: { 1: { cellWidth: 110 } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Grocery List (categorized if possible) ──
  if (plan.grocery_list?.length) {
    checkPage(20);
    doc.setFontSize(14);
    doc.setTextColor(...green);
    doc.text("Grocery List", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const cols = 3;
    const colWidth = 60;
    plan.grocery_list.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (col === 0 && row > 0) checkPage(5);
      doc.text(`• ${item}`, 14 + col * colWidth, y + row * 5);
    });
    y += Math.ceil(plan.grocery_list.length / cols) * 5 + 8;
  }

  // ── Progression Rules ──
  if (plan.progressionRules) {
    checkPage(20);
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text("📈 Progression Rules", 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(plan.progressionRules, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 6;
  }

  // ── Deload Week ──
  if (plan.deloadWeek) {
    checkPage(20);
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text("🔄 Deload Week", 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(plan.deloadWeek, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 6;
  }

  // ── Recovery Tips ──
  if (plan.recoveryTips) {
    checkPage(20);
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text("💤 Recovery Tips", 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(plan.recoveryTips, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 6;
  }

  // ── Safety Notes / Warnings ──
  const allWarnings = [...(plan.warnings || []), ...(plan.safety_notes || [])];
  if (allWarnings.length) {
    checkPage(20);
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text("⚠ Safety & Warnings", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    allWarnings.forEach((note) => {
      checkPage(10);
      const lines = doc.splitTextToSize(`⚠ ${note}`, 180);
      doc.text(lines, 14, y);
      y += lines.length * 4.5;
    });
    y += 4;
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Generated by Surya-FitAi — ${new Date().toLocaleDateString()}`, 14, 290);
    doc.text(`Page ${i} of ${pageCount}`, 180, 290);
  }

  doc.save(`Surya-FitAi-${(programType || "plan").replace(/\s/g, "-")}-plan.pdf`);
}
