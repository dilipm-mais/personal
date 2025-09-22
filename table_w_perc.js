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

    // Extract dimension and measures
    const dimensionName = queryResponse.fields.dimensions[0].name;
    const measureNames = queryResponse.fields.measures.map(m => m.name);
    const tableCalcNames = queryResponse.fields.table_calculations.map(tc => tc.name);
    const allFields = [...measureNames, ...tableCalcNames];

    // Build table data
    const tableRows = data.map(row => {
      const dimVal = row[dimensionName].rendered || row[dimensionName].value;
      const measures = allFields.map(f => row[f].value);
      return [dimVal, ...measures];
    });

    // Calculate percentage change row
    const firstRow = tableRows[0];
    const secondRow = tableRows[1];
    const pctChangeRow = ["% Change"];
    for (let i = 1; i < firstRow.length; i++) {
      const v1 = firstRow[i];
      const v2 = secondRow[i];
      let pct = null;
      if (typeof v1 === "number" && typeof v2 === "number" && v1 !== 0) {
        pct = ((v2 - v1) / Math.abs(v1)) * 100;
      }
      pctChangeRow.push(pct !== null ? pct : null);
    }

    // Prepare Highcharts data table format
    const categories = ["", ...allFields];
    const htmlTable = `
      <table class="hc-table" style="border-collapse:collapse; width:100%; text-align:center;">
        <thead>
          <tr>${categories.map(c => `<th style="border:1px solid #ccc; padding:4px;">${c}</th>`).join("")}</tr>
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

