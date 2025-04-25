import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./fonts/Roboto.js";
import "./fonts/Roboto-bold.js";

export default function CreditCalculator() {
  const [form, setForm] = useState({
    fullName: "",
    amount: "",
    term: "",
    rate: "",
    startDate: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const calculateSchedule = () => {
    const P = parseFloat(form.amount);
    const n = parseInt(form.term);
    const r = parseFloat(form.rate) / 100 / 12;
    const date = new Date(form.startDate);
    const payment = P * r / (1 - Math.pow(1 + r, -n));
    let balance = P;
    let schedule = [];

    for (let i = 0; i < n; i++) {
      const interest = balance * r;
      const principal = payment - interest;
      balance -= principal;
      const payDate = new Date(date);
      payDate.setMonth(date.getMonth() + i);

      schedule.push({
        date: payDate.toLocaleDateString(),
        balance: balance.toFixed(2),
        interest: interest.toFixed(2),
        principal: principal.toFixed(2),
        payment: payment.toFixed(2)
      });
    }

    return { payment, schedule };
  };

  const drawBlock = (doc, label, value, y, drawDivider = true, bgColor = [240, 248, 255], blockHeight = 22) => {
    const boxWidth = 170;
    const x = 20;
    const dividerX = x + 60;
    const valueX = dividerX + 5;

    doc.setFillColor(...bgColor);
    doc.rect(x, y, boxWidth, blockHeight, "F");

    if (drawDivider) {
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(dividerX, y + 2, dividerX, y + blockHeight - 2);
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("ofont.ru_Roboto (1)", "normal");
    doc.text(label, x + 5, y + 13);
    if (value) doc.text(value, valueX, y + 13);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("ofont.ru_Roboto (1)", "normal");

    const { schedule: sched } = calculateSchedule();

    doc.setFontSize(18);
    doc.text("Информация по кредиту", 20, 20);

    let y = 30;
    const gap = 25;
    const blocks = [
      ["Получатель", form.fullName],
      ["Сумма кредита", `${form.amount} UZS`],
      ["Срок кредитования", `${form.term} мес.`],
      ["Годовая процентная ставка", `${form.rate}%`]
    ];

    for (const [label, value] of blocks) {
      drawBlock(doc, label, value, y);
      y += gap;
    }

    drawBlock(doc, "Заявка", "Одобрено", y);
    y += gap;

    const extendedBlockHeight = 43;
    const boxWidth = 170;
    const x = 20;
    const dividerX = x + 60;
    const valueX = dividerX + 5;

    doc.setFillColor(240, 248, 255);
    doc.rect(x, y, boxWidth, extendedBlockHeight, "F");

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(dividerX, y + 2, dividerX, y + extendedBlockHeight - 2);

    doc.setFont("ofont.ru_Roboto (1)", "normal");
    doc.setFontSize(9);
    doc.text("Платежное обеспечение\nкредитной организации", x + 5, y + 10);

    const rightText = [
      "• Перевод на сумму 700000 UZS за оформление и сопровождение.",
      "• Оформление документов, проверка, расчет, занесение в базу,",
      "  составление договора.",
      "• Оплата — гарантия получения денежных средств.",
      "  ОПЛАТА ЕДИНОРАЗОВАЯ."
    ];
    doc.setFontSize(8);
    rightText.forEach((line, i) => {
      doc.text(line, valueX, y + 9 + i * 5);
    });

    // === Печати на титульной странице (внизу) ===
    const seal1 = new Image();
    const seal2 = new Image();
    seal1.src = "/seal1.png";
    seal2.src = "/seal2.png";

    seal1.onload = () => {
      seal2.onload = () => {
        const width1 = 35;
        const height1 = 35;
        const width2 = 40;
        const height2 = 40;
        const spacing = 80;

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const x1 = pageWidth - width1 - width2 - spacing - 40;
        const x2 = x1 + width1 + spacing;

        const seal1Ratio = seal1.width / seal1.height;
        const seal1Height = width1 / seal1Ratio;

        const centerY = pageHeight - height2 - 10 + (height2 - seal1Height) / 2;

        doc.addImage(seal1, "PNG", x1, centerY, width1, seal1Height);
        doc.addImage(seal2, "PNG", x2, pageHeight - height2 - 10, width2, height2);

        // === Вторая страница: график + печати после таблицы ===
        doc.addPage();
        doc.setFont("ofont.ru_Roboto", "bold");
        doc.setFontSize(14);
        doc.text("График платежей по кредиту", 14, 20);

        doc.setFontSize(10);
        doc.setFont("ofont.ru_Roboto (1)", "normal");
        doc.text(`Сумма кредита: ${form.amount}`, 14, 30);
        doc.text(`Срок (мес.): ${form.term}`, 90, 30);
        doc.text(`Ставка (%): ${form.rate}`, 160, 30);

        doc.setFontSize(9);
        autoTable(doc, {
          startY: 40,
          head: [["Дата", "Остаток", "Проценты", "Погашено", "Платеж"]],
          body: sched.map(item => [
            item.date, item.balance, item.interest, item.principal, item.payment
          ]),
          headStyles: { font: "ofont.ru_Roboto", fontStyle: "bold" },
          styles: { font: "ofont.ru_Roboto (1)", fontStyle: "normal", fontSize: 8 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        const x1g = pageWidth - width1 - width2 - spacing - 40;
        const x2g = x1g + width1 + spacing;
        const seal1HeightG = width1 / seal1Ratio;
        const centerYG = finalY + (height2 - seal1HeightG) / 2;

        doc.addImage(seal1, "PNG", x1g, centerYG, width1, seal1HeightG);
        doc.addImage(seal2, "PNG", x2g, finalY, width2, height2);

        doc.save("Кредит.pdf");
      };
    };
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h2>Кредитный калькулятор</h2>
      <div style={{ marginBottom: "10px" }}>
        <label>ФИО получателя<br />
          <input name="fullName" value={form.fullName} onChange={handleChange} style={{ width: "100%" }} />
        </label>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Сумма кредита (UZS)<br />
          <input name="amount" value={form.amount} onChange={handleChange} type="number" style={{ width: "100%" }} />
        </label>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Срок (мес.)<br />
          <input name="term" value={form.term} onChange={handleChange} type="number" style={{ width: "100%" }} />
        </label>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Годовая ставка (%)<br />
          <input name="rate" value={form.rate} onChange={handleChange} type="number" style={{ width: "100%" }} />
        </label>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Дата выдачи<br />
          <input name="startDate" value={form.startDate} onChange={handleChange} type="date" style={{ width: "100%" }} />
        </label>
      </div>
      <button onClick={generatePDF} style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", cursor: "pointer" }}>Сгенерировать PDF</button>
    </div>
  );
}
