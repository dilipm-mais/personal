looker.plugins.visualizations.add({
  id: "custom-table-pct-change",
  label: "Custom Table with Percentage Change",
  options: {},

   create: function (element, config) {
    // Prepare the container
    element.innerHTML = `
      <div id="hc-table-container" style="width:100%; overflow:auto;"></div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    const container = element.querySelector("#hc-table-container");
    container.innerHTML = "";

    if (!data || data.length < 2) {
      container.innerHTML = `<p style="color:red">Need at least 2 rows to calculate % change.</p>`;
      done();
      return;
    }

    // ---- 1️⃣ Extract dimension and measures (with labels + formats) ----
    const dimensionField = queryResponse.fields.dimensions[0];
    const measureFields = queryResponse.fields.measures;
    const tableCalcFields = queryResponse.fields.table_calculations;
    const allFields = [...measureFields, ...tableCalcFields];

    // ---- 2️⃣ Build table rows with Looker formatting ----
    const tableRows = data.map(row => {
      const dimVal = row[dimensionField.name].rendered || row[dimensionField.name].value;
      const measures = allFields.map(f => {
        const cell = row[f.name];
        if (cell.rendered !== undefined && cell.rendered !== null) {
          return cell.rendered; // use Looker-rendered value when possible
        }
        if (typeof cell.value === "number" && f.value_format) {
          try {
            return LookerCharts.Utils.numberFormat(cell.value, f.value_format);
          } catch (e) {
            return cell.value;
          }
        }
        return cell.value;
      });
      return [dimVal, ...measures];
    });

    // ---- 3️⃣ Calculate % change row (raw numbers first) ----
    const firstRowRaw = data[0];
    const secondRowRaw = data[1];
    const pctChangeRow = ["% Change"];
    for (const f of allFields) {
      const v1 = firstRowRaw[f.name].value;
      const v2 = secondRowRaw[f.name].value;
      let pct = null;
      if (typeof v1 === "number" && typeof v2 === "number" && v1 !== 0) {
        pct = ((v2 - v1) / Math.abs(v1)) * 100;
      }
      pctChangeRow.push(pct !== null ? pct : null);
    }

    // ---- 4️⃣ Build HTML Table ----
    const headers = [dimensionField.label_short, ...allFields.map(f => f.label_short)];
    const htmlTable = `
      <table class="hc-table" style="border-collapse:collapse; width:100%; text-align:center;">
        <thead>
          <tr>${headers.map(h => `<th style="border:1px solid #ccc; padding:4px;">${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${tableRows.map(r => `
            <tr>${r.map(c => `<td style="border:1px solid #ccc; padding:4px;">${c}</td>`).join("")}</tr>
          `).join("")}
          <tr style="font-weight:bold; background:#f5f5f5;">
            ${pctChangeRow.map((c, i) => {
              if (i === 0) return `<td>% Change</td>`;
              if (c === null) return `<td>-</td>`;
              const arrow = c > 0 ? "⬆" : c < 0 ? "⬇" : "";
              return `<td>${arrow} ${c.toFixed(1)}%</td>`;
            }).join("")}
          </tr>
        </tbody>
      </table>
    `;

    container.innerHTML = htmlTable;

    done();
  }
});
