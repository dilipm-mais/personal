looker.plugins.visualizations.add({
  id: "shipping_chart_github",
  label: "Shipping Chart Git",
  options: {},

  create: function(element, config){
    // Root container
    element.style.fontFamily = 'Inter, Roboto, Helvetica, Arial, sans-serif';
    element.innerHTML = `
      <style>
        .flow-root{display:flex;align-items:center;justify-content:space-between;width:100%;height:140px;box-sizing:border-box;padding:10px}
        .stage{flex:1;display:flex;flex-direction:column;align-items:center}
        .rect{min-width:160px;max-width:220px;padding:14px 16px;border-radius:8px;background:#f5f7fa;border:1px solid #d6dbe6;box-shadow:0 2px 6px rgba(10,10,10,0.04);text-align:center;font-weight:600}
        .arrow-wrap{width:140px;display:flex;flex-direction:column;align-items:center}
        .arrow-svg{width:100%;height:48px}
        .arrow-label-top{font-size:13px;font-weight:700;margin-bottom:4px}
        .arrow-label-bottom{font-size:12px;margin-top:6px;color:#555}
        .horizontal{display:flex;align-items:center;justify-content:space-between;width:100%}
        @media (max-width:800px){
          .flow-root{flex-direction:column;height:auto}
          .horizontal{flex-direction:column;align-items:center}
          .arrow-wrap{transform:rotate(90deg);margin:8px 0;width:64px}
        }
      </style>

      <div class="flow-root">
        <div class="horizontal" id="flowRow">
          <!-- dynamic content inserted by update -->
        </div>
      </div>
    `;

    // Save reference for update
    this._flowRow = element.querySelector('#flowRow');
  },

  update: function(data, element, config, queryResponse){
    // The visualization shows 4 rectangles with fixed labels and three arrows between them.
    // It pulls the 3 measure values returned by the Looker query and displays them above the arrows.

    // Fixed stage labels (left to right)
    const stageLabels = [
      'Order Placed',
      'Accepted by Vendor',
      'Marked as Shipped',
      'Scanned by Carrier'
    ];

    // Bottom labels under arrows
    const arrowBottomLabels = [
      'Time to Accept (hrs)',
      'Time to Mark as Shipped (hrs)',
      'Time to Scan (hrs)'
    ];

    // Clear previous content
    this._flowRow.innerHTML = '';

    // Collect measures from queryResponse. We'll use the first three measures available.
    const measures = (queryResponse && queryResponse.fields && queryResponse.fields.measure_like) ?
      queryResponse.fields.measure_like : (queryResponse && queryResponse.fields && queryResponse.fields.measures) ?
      queryResponse.fields.measures : [];

    // Choose up to three measures
    const measureFields = measures.slice(0,3);

    // Helper to extract a rendered/usable value from the Looker data row
    function extractRenderedValue(row, field){
      if(!row || !field) return '';
      const key = field.name || field.field_name || field.label_short || field.label;
      // Typical Looker row: row[field.name] -> { value: ..., rendered: '...'} or directly a primitive
      const candidate = row[field.name] || row[field.field_name] || row[key] || row[field.label_short];
      if(candidate == null) return '';
      if(typeof candidate === 'object'){
        // prefer rendered, then value
        return (candidate.rendered !== undefined && candidate.rendered !== null) ? candidate.rendered : (candidate.value !== undefined ? candidate.value : JSON.stringify(candidate));
      }
      return candidate;
    }

    // For display we will pick a representative value per measure. If the query returns multiple rows
    // and measure is aggregating, usually there's one row. If multiple, we'll sum numeric values as fallback.
    function computeMeasureValue(measure){
      if(!measure) return '';
      // try to find a single rendered value from the first row
      if(data.length === 0) return '';

      // If there's only one row, use it
      if(data.length === 1){
        const v = extractRenderedValue(data[0], measure);
        return v;
      }

      // If multiple rows, attempt to compute an aggregate if possible
      // Try numeric sum
      let numericSum = 0;
      let foundNumeric = false;
      for(const row of data){
        const raw = row[measure.name];
        let val = null;
        if(raw == null) continue;
        if(typeof raw === 'object'){
          val = raw.value !== undefined ? raw.value : (raw.rendered !== undefined ? parseFloat(String(raw.rendered).replace(/[^0-9.-]+/g, '')) : null);
        } else {
          val = raw;
        }
        const num = typeof val === 'number' ? val : ( (typeof val === 'string' && val.trim().length>0) ? parseFloat(val.replace(/[^0-9.-]+/g, '')) : NaN );
        if(!isNaN(num)){
          numericSum += num;
          foundNumeric = true;
        }
      }
      if(foundNumeric) return numericSum;

      // fallback: return joined rendered values (first 6)
      const rendered = data.slice(0,6).map(r=> extractRenderedValue(r, measure)).filter(x=>x!=='');
      return rendered.join(', ');
    }

    // Build the DOM: stage, arrow, stage, arrow, stage, arrow, stage
    // We'll create a helper that appends a stage box and optionally an arrow after it (except last)

    const totalStages = 4;

    for(let i=0;i<totalStages;i++){
      // Stage container
      const stageDiv = document.createElement('div');
      stageDiv.className = 'stage';

      const rect = document.createElement('div');
      rect.className = 'rect';
      rect.innerText = stageLabels[i] || '';

      stageDiv.appendChild(rect);
      this._flowRow.appendChild(stageDiv);

      // If not the last stage, add arrow block
      if(i < totalStages - 1){
        const arrowWrap = document.createElement('div');
        arrowWrap.className = 'arrow-wrap';

        const topLabel = document.createElement('div');
        topLabel.className = 'arrow-label-top';

        // Map measure 0->between stage0-1, measure1->between 1-2, measure2->between 2-3
        const measureIndex = i; // arrows are after stage i, so arrow i corresponds to measure i
        const measureField = measureFields[measureIndex];
        const topValue = measureField ? computeMeasureValue(measureField) : '';
        topLabel.innerText = topValue !== '' ? String(topValue) : (measureField ? '[no value]' : '[no measure]');

        // SVG arrow (simple line with arrowhead) horizontally centered
        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('class','arrow-svg');
        svg.setAttribute('viewBox','0 0 140 48');
        svg.setAttribute('preserveAspectRatio','xMidYMid meet');

        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1','0');
        line.setAttribute('y1','24');
        line.setAttribute('x2','116');
        line.setAttribute('y2','24');
        line.setAttribute('stroke','#b7c2d6');
        line.setAttribute('stroke-width','4');
        line.setAttribute('stroke-linecap','round');
        svg.appendChild(line);

        const polygon = document.createElementNS('http://www.w3.org/2000/svg','polygon');
        polygon.setAttribute('points','116,14 140,24 116,34');
        polygon.setAttribute('fill','#b7c2d6');
        svg.appendChild(polygon);

        const bottomLabel = document.createElement('div');
        bottomLabel.className = 'arrow-label-bottom';
        bottomLabel.innerText = arrowBottomLabels[measureIndex] || '';

        arrowWrap.appendChild(topLabel);
        arrowWrap.appendChild(svg);
        arrowWrap.appendChild(bottomLabel);

        this._flowRow.appendChild(arrowWrap);
      }
    }

    // Accessibility: add title/description
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', 'Four stage flow: Ordered to Scanned with three transition times shown');
  }
});


