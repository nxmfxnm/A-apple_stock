// ==========================================
// Apple Stock Dashboard
// Price + Volume + Seasonality
// Synchronized Interactive Version
// ==========================================

const width = 650;
const height = 420;

const margin = {
  top: 40,
  right: 30,
  bottom: 50,
  left: 65
};

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const widthSeason = 1320;
const seasonHeight = 260;
const innerWidthSeason = widthSeason - margin.left - margin.right;

// ==========================================
// SVG
// ==========================================

const svgLine = d3
  .select("#lineChart")
  .attr("viewBox", `0 0 ${width} ${height}`);

const chartLine = svgLine
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const svgBar = d3
  .select("#volumeChart")
  .attr("viewBox", `0 0 ${width} ${height}`);

const chartBar = svgBar
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const svgSeason = d3
  .select("#seasonChart")
  .attr("viewBox", `0 0 ${widthSeason} ${seasonHeight}`);

const chartSeason = svgSeason
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top - 10})`);


// ==========================================
// Tooltip
// ==========================================

const tooltip = d3.select("#tooltip");


// ==========================================
// Events
// ==========================================

const events = [
  {
    id: "2020-03",
    date: "2020-03",
    title: "COVID-19 Demand",
    desc: "ช่วง WFH ความต้องการ Mac และ iPad เพิ่มขึ้น"
  },
  {
    id: "2020-08",
    date: "2020-08",
    title: "4-for-1 Stock Split",
    desc: "Apple แตกหุ้น 4 ต่อ 1"
  },
  {
    id: "2020-11",
    date: "2020-11",
    title: "M1 & iPhone 12",
    desc: "เปิดตัว Apple Silicon M1 และ iPhone 12"
  },
  {
    id: "2023-06",
    date: "2023-06",
    title: "Vision Pro & $3T",
    desc: "เปิดตัว Vision Pro และมูลค่าตลาดทะลุ 3 ล้านล้านดอลลาร์"
  }
];

let selectEventFn = null;
let resetViewFn = null;
let toggleSeasonMetric = null;


// ==========================================
// Load CSV
// ==========================================

d3.csv("data/apple_stock_monthly.csv")
  .then(rawData => {

    const parseDate = d3.timeParse("%Y-%m");

    const cleanData = rawData
      .map(d => {

        const rawDate =
          d.Year_Month ||
          d.Date ||
          d.date;

        const rawClose =
          d.Avg_Close ||
          d.Close ||
          d.close;

        const rawVolume =
          d.Total_Volume ||
          d.Volume ||
          d.volume;

        const dt =
          parseDate(rawDate) ||
          new Date(rawDate);

        return {
          Year_Month: dt,
          Month_Index: dt ? dt.getMonth() : null,
          Avg_Close: +rawClose,
          Total_Volume: +rawVolume || 0
        };
      })
      .filter(d =>
        d.Year_Month &&
        !isNaN(d.Avg_Close) &&
        !isNaN(d.Total_Volume)
      );

    cleanData.sort(
      (a, b) => a.Year_Month - b.Year_Month
    );

    drawDashboard(cleanData);

  })
  .catch(error => {

    console.warn(
      "ไม่สามารถโหลด CSV:",
      error
    );

    drawDashboard(generateFallbackData());

  });


// ==========================================
// Fallback Data
// ==========================================

function generateFallbackData() {

  const data = [];

  let date = new Date(2020, 0, 1);
  let price = 75;

  for (let i = 0; i < 60; i++) {

    price +=
      (Math.random() - 0.42) * 7;

    data.push({
      Year_Month: new Date(date),
      Month_Index: date.getMonth(),
      Avg_Close: Math.max(50, price),
      Total_Volume:
        Math.floor(
          Math.random() * 1500000000
        ) + 700000000
    });

    date.setMonth(
      date.getMonth() + 1
    );
  }

  return data;
}


// ==========================================
// Main Dashboard
// ==========================================

function drawDashboard(data) {

  chartLine.selectAll("*").remove();
  chartBar.selectAll("*").remove();
  chartSeason.selectAll("*").remove();

  const parseDate =
    d3.timeParse("%Y-%m");

  const formatMonth =
    d3.timeFormat("%Y-%m");

  const monthNames = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค."
  ];


  // ==========================================
  // Seasonality Data
  // ==========================================

  const monthlyStats =
    d3.range(12).map(monthIndex => {

      const monthData =
        data.filter(
          d => d.Month_Index === monthIndex
        );

      return {

        monthIndex,

        monthName:
          monthNames[monthIndex],

        avgPrice:
          d3.mean(
            monthData,
            d => d.Avg_Close
          ) || 0,

        avgVolume:
          d3.mean(
            monthData,
            d => d.Total_Volume
          ) || 0
      };

    });


  // ==========================================
  // Scales
  // ==========================================

  const xBase =
    d3.scaleTime()
      .domain(
        d3.extent(
          data,
          d => d.Year_Month
        )
      )
      .range([0, innerWidth]);


  const yLine =
    d3.scaleLinear()
      .domain([
        0,
        d3.max(
          data,
          d => d.Avg_Close
        ) * 1.08
      ])
      .nice()
      .range([
        innerHeight,
        0
      ]);


  const volumeValues =
    data
      .map(d => d.Total_Volume)
      .sort(d3.ascending);


  const maxVolume =
    d3.quantile(
      volumeValues,
      0.98
    ) ||
    d3.max(
      data,
      d => d.Total_Volume
    );


  const yBar =
    d3.scaleLinear()
      .domain([
        0,
        maxVolume
      ])
      .range([
        innerHeight,
        0
      ]);


  let currentXScale = xBase;


  // ==========================================
  // AXIS
  // ==========================================

  const xAxisLine =
    chartLine
      .append("g")
      .attr(
        "transform",
        `translate(0,${innerHeight})`
      )
      .call(
        d3.axisBottom(xBase)
          .ticks(6)
          .tickFormat(
            d3.timeFormat("%Y")
          )
      );


  chartLine
    .append("g")
    .call(
      d3.axisLeft(yLine)
        .ticks(7)
        .tickFormat(
          d => `$${d}`
        )
    );


  const xAxisBar =
    chartBar
      .append("g")
      .attr(
        "transform",
        `translate(0,${innerHeight})`
      )
      .call(
        d3.axisBottom(xBase)
          .ticks(6)
          .tickFormat(
            d3.timeFormat("%Y")
          )
      );


  chartBar
    .append("g")
    .call(
      d3.axisLeft(yBar)
        .ticks(7)
        .tickFormat(
          d3.format(".2s")
        )
    );


  // ==========================================
  // Axis Labels
  // ==========================================

  chartLine
    .append("text")
    .attr("class", "axis-label")
    .attr(
      "x",
      innerWidth / 2
    )
    .attr(
      "y",
      innerHeight + 40
    )
    .attr(
      "text-anchor",
      "middle"
    )
    .text("Year / Time");


  chartLine
    .append("text")
    .attr("class", "axis-label")
    .attr(
      "transform",
      "rotate(-90)"
    )
    .attr(
      "x",
      -innerHeight / 2
    )
    .attr("y", -48)
    .attr(
      "text-anchor",
      "middle"
    )
    .text(
      "Average Close Price ($)"
    );


  chartBar
    .append("text")
    .attr("class", "axis-label")
    .attr(
      "x",
      innerWidth / 2
    )
    .attr(
      "y",
      innerHeight + 40
    )
    .attr(
      "text-anchor",
      "middle"
    )
    .text("Year / Time");


  chartBar
    .append("text")
    .attr("class", "axis-label")
    .attr(
      "transform",
      "rotate(-90)"
    )
    .attr(
      "x",
      -innerHeight / 2
    )
    .attr("y", -48)
    .attr(
      "text-anchor",
      "middle"
    )
    .text(
      "Total Volume (Shares)"
    );


  // ==========================================
  // Grid
  // ==========================================

  const gridXLine =
    chartLine
      .append("g")
      .attr("class", "grid")
      .attr(
        "transform",
        `translate(0,${innerHeight})`
      )
      .call(
        d3.axisBottom(xBase)
          .ticks(6)
          .tickSize(-innerHeight)
          .tickFormat("")
      );


  chartLine
    .append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(yLine)
        .ticks(7)
        .tickSize(-innerWidth)
        .tickFormat("")
    );


  const gridXBar =
    chartBar
      .append("g")
      .attr("class", "grid")
      .attr(
        "transform",
        `translate(0,${innerHeight})`
      )
      .call(
        d3.axisBottom(xBase)
          .ticks(6)
          .tickSize(-innerHeight)
          .tickFormat("")
      );


  chartBar
    .append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(yBar)
        .ticks(7)
        .tickSize(-innerWidth)
        .tickFormat("")
    );


  // ==========================================
  // Clip
  // ==========================================

  chartLine
    .append("clipPath")
    .attr("id", "clip-line")
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight);


  chartBar
    .append("clipPath")
    .attr("id", "clip-bar")
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight);


  const bodyLine =
    chartLine
      .append("g")
      .attr(
        "clip-path",
        "url(#clip-line)"
      );


  const bodyBar =
    chartBar
      .append("g")
      .attr(
        "clip-path",
        "url(#clip-bar)"
      );


  // ==========================================
  // PRICE LINE
  // ==========================================

  const lineGenerator =
    d3.line()
      .x(
        d =>
          xBase(d.Year_Month)
      )
      .y(
        d =>
          yLine(d.Avg_Close)
      )
      .curve(
        d3.curveMonotoneX
      );


  const path =
    bodyLine
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr(
        "stroke",
        "#0071e3"
      )
      .attr(
        "stroke-width",
        2.5
      )
      .attr(
        "d",
        lineGenerator
      );


  const dots =bodyLine
      .selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class","dot")
      .attr(
        "cx",
        d =>
          xBase(d.Year_Month)
      )
      .attr(
        "cy",
        d =>
          yLine(d.Avg_Close)
      )
      .attr("r", 3)
      .attr(
        "fill",
        "#0071e3"
      )
      .style(
        "cursor",
        "pointer"
      );
const tooltip = d3.select("#tooltip");

dots
    .on("mouseenter", function(event, d) {

        d3.select(this)
            .attr("r", 7);

        tooltip
            .style("opacity", 1)
            .html(`
                <div class="tooltip-title">
                    ${d3.timeFormat("%B %Y")(d.Year_Month)}
                </div>

                <div>
                    Average Price:
                    <b>$${d.Avg_Close.toFixed(2)}</b>
                </div>

                <div>
                    Volume:
                    <b>${d3.format(",")(d.Total_Volume)}</b>
                </div>
            `);

        tooltip
            .style("left", `${event.clientX + 15}px`)
            .style("top", `${event.clientY + 15}px`);
    })

    .on("mousemove", function(event) {

        tooltip
            .style("left", `${event.clientX + 15}px`)
            .style("top", `${event.clientY + 15}px`);
    })

    .on("mouseleave", function() {

        d3.select(this)
            .attr("r", 3);

        tooltip
            .style("opacity", 0);
    });

  // ==========================================
  // PRICE POINTER
  // ==========================================

  const linePointer =
    bodyLine
      .append("line")
      .attr(
        "class",
        "sync-pointer-line"
      )
      .attr("y1", 0)
      .attr(
        "y2",
        innerHeight
      )
      .style(
        "opacity",
        0
      );


  // ==========================================
  // VOLUME
  // ==========================================

  let barWidth =
    Math.max(
      1,
      innerWidth / data.length - 0.5
    );


  const bars =
    bodyBar
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr(
        "class",
        "bar"
      )
      .attr(
        "x",
        d =>
          xBase(d.Year_Month) -
          barWidth / 2
      )
      .attr(
        "width",
        barWidth
      )
      .attr(
        "y",
        d =>
          yBar(
            Math.min(
              d.Total_Volume,
              maxVolume
            )
          )
      )
      .attr(
        "height",
        d =>
          innerHeight -
          yBar(
            Math.min(
              d.Total_Volume,
              maxVolume
            )
          )
      )
      .attr(
        "fill",
        "#34c759"
      )
      .attr(
        "opacity",
        0.75
      )
      .style(
        "cursor",
        "pointer"
      );
bars
    .on("mouseenter", function(event, d) {

        d3.select(this)
            .attr("opacity", 1);

        tooltip
            .style("opacity", 1)
            .html(`
                <div class="tooltip-title">
                    ${d3.timeFormat("%B %Y")(d.Year_Month)}
                </div>

                <div>
                    Volume:
                    <b>${d3.format(",")(d.Total_Volume)}</b>
                </div>

                <div>
                    Average Price:
                    <b>$${d.Avg_Close.toFixed(2)}</b>
                </div>
            `);

        tooltip
            .style("left", `${event.clientX + 15}px`)
            .style("top", `${event.clientY + 15}px`);
    })

    .on("mousemove", function(event) {

        tooltip
            .style("left", `${event.clientX + 15}px`)
            .style("top", `${event.clientY + 15}px`);
    })

    .on("mouseleave", function() {

        d3.select(this)
            .attr("opacity", 0.75);

        tooltip
            .style("opacity", 0);
    });

  const barPointer =
    bodyBar
      .append("line")
      .attr(
        "class",
        "sync-pointer-line"
      )
      .attr("y1", 0)
      .attr(
        "y2",
        innerHeight
      )
      .style(
        "opacity",
        0
      );


  // ==========================================
  // SEASONALITY
  // ==========================================

  const xSeason =
    d3.scaleBand()
      .domain(
        monthlyStats.map(
          d => d.monthName
        )
      )
      .range([
        0,
        innerWidthSeason
      ])
      .padding(0.25);


  const ySeasonPrice =
    d3.scaleLinear()
      .domain([
        0,
        d3.max(
          monthlyStats,
          d => d.avgPrice
        ) * 1.15
      ])
      .nice()
      .range([
        seasonHeight - margin.top - 40,
        0
      ]);


  const ySeasonVol =
    d3.scaleLinear()
      .domain([
        0,
        d3.max(
          monthlyStats,
          d => d.avgVolume
        ) * 1.15
      ])
      .nice()
      .range([
        seasonHeight - margin.top - 40,
        0
      ]);


  const seasonInnerHeight =
    seasonHeight - margin.top - 40;


  const xAxisSeason =
    chartSeason
      .append("g")
      .attr(
        "transform",
        `translate(0,${seasonInnerHeight})`
      )
      .call(
        d3.axisBottom(xSeason)
      );


  const yAxisSeason =
    chartSeason
      .append("g")
      .call(
        d3.axisLeft(ySeasonPrice)
          .ticks(5)
          .tickFormat(
            d => `$${d}`
          )
      );


  chartSeason
    .append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(ySeasonPrice)
        .ticks(5)
        .tickSize(
          -innerWidthSeason
        )
        .tickFormat("")
    );


  // ==========================================
  // Seasonality Axis Labels
  // ==========================================

  chartSeason
    .append("text")
    .attr(
      "class",
      "axis-label"
    )
    .attr(
      "x",
      innerWidthSeason / 2
    )
    .attr(
      "y",
      seasonInnerHeight + 35
    )
    .attr(
      "text-anchor",
      "middle"
    )
    .text(
      "Month (Average Across All Years)"
    );


  const seasonYLabel =
    chartSeason
      .append("text")
      .attr(
        "class",
        "axis-label"
      )
      .attr(
        "transform",
        "rotate(-90)"
      )
      .attr(
        "x",
        -seasonInnerHeight / 2
      )
      .attr(
        "y",
        -48
      )
      .attr(
        "text-anchor",
        "middle"
      )
      .text(
        "Average Close Price ($)"
      );


  // ==========================================
  // Seasonality Bars
  // ==========================================

  const seasonBars =
    chartSeason
      .selectAll(
        ".season-bar"
      )
      .data(monthlyStats)
      .enter()
      .append("rect")
      .attr(
        "class",
        "season-bar"
      )
      .attr(
        "x",
        d =>
          xSeason(d.monthName)
      )
      .attr(
        "width",
        xSeason.bandwidth()
      )
      .attr(
        "y",
        d =>
          ySeasonPrice(
            d.avgPrice
          )
      )
      .attr(
        "height",
        d =>
          seasonInnerHeight -
          ySeasonPrice(
            d.avgPrice
          )
      )
      .attr(
        "fill",
        "#5856d6"
      )
      .attr(
        "opacity",
        0.85
      )
      .attr(
        "rx",
        5
      )
      .style(
        "cursor",
        "pointer"
      );
seasonBars
    .on("mouseenter", function(event, d) {

        d3.select(this)
            .attr("opacity", 1)
            .attr("stroke", "#000")
            .attr("stroke-width", 2);

        tooltip
            .style("opacity", 1)
            .html(`
                <div class="tooltip-title">
                    ${d.monthName}
                </div>

                <div>
                    Average Price:
                    <b>$${d.avgPrice.toFixed(2)}</b>
                </div>

                <div>
                    Average Volume:
                    <b>${d3.format(",")(Math.round(d.avgVolume))}</b>
                </div>
            `);

        tooltip
            .style("left", `${event.clientX + 15}px`)
            .style("top", `${event.clientY + 15}px`);
    })

    .on("mousemove", function(event) {

        tooltip
            .style("left", `${event.clientX + 15}px`)
            .style("top", `${event.clientY + 15}px`);
    })

    .on("mouseleave", function() {

        d3.select(this)
            .attr("opacity", 0.85)
            .attr("stroke", "none");

        tooltip
            .style("opacity", 0);
    });

  const seasonLabels =
    chartSeason
      .selectAll(
        ".season-label"
      )
      .data(monthlyStats)
      .enter()
      .append("text")
      .attr(
        "class",
        "season-label"
      )
      .attr(
        "x",
        d =>
          xSeason(d.monthName) +
          xSeason.bandwidth() / 2
      )
      .attr(
        "y",
        d =>
          ySeasonPrice(
            d.avgPrice
          ) - 7
      )
      .attr(
        "text-anchor",
        "middle"
      )
      .attr(
        "font-size",
        "11px"
      )
      .attr(
        "font-weight",
        "bold"
      )
      .attr(
        "fill",
        "#5856d6"
      )
      .text(
        d =>
          `$${d.avgPrice.toFixed(1)}`
      );


  // ==========================================
  // SEASON METRIC
  // ==========================================

  toggleSeasonMetric =
    metric => {

      d3.select(
        "#btnSeasonPrice"
      )
        .classed(
          "active",
          metric === "price"
        );


      d3.select(
        "#btnSeasonVol"
      )
        .classed(
          "active",
          metric === "volume"
        );


      if (metric === "price") {

        yAxisSeason
          .transition()
          .duration(350)
          .call(
            d3.axisLeft(
              ySeasonPrice
            )
              .ticks(5)
              .tickFormat(
                d => `$${d}`
              )
          );


        seasonYLabel.text(
          "Average Close Price ($)"
        );


        seasonBars
          .transition()
          .duration(350)
          .attr(
            "y",
            d =>
              ySeasonPrice(
                d.avgPrice
              )
          )
          .attr(
            "height",
            d =>
              seasonInnerHeight -
              ySeasonPrice(
                d.avgPrice
              )
          )
          .attr(
            "fill",
            "#5856d6"
          );


        seasonLabels
          .transition()
          .duration(350)
          .attr(
            "y",
            d =>
              ySeasonPrice(
                d.avgPrice
              ) - 7
          )
          .attr(
            "fill",
            "#5856d6"
          )
          .text(
            d =>
              `$${d.avgPrice.toFixed(1)}`
          );

      } else {

        yAxisSeason
          .transition()
          .duration(350)
          .call(
            d3.axisLeft(
              ySeasonVol
            )
              .ticks(5)
              .tickFormat(
                d3.format(".2s")
              )
          );


        seasonYLabel.text(
          "Average Volume (Shares)"
        );


        seasonBars
          .transition()
          .duration(350)
          .attr(
            "y",
            d =>
              ySeasonVol(
                d.avgVolume
              )
          )
          .attr(
            "height",
            d =>
              seasonInnerHeight -
              ySeasonVol(
                d.avgVolume
              )
          )
          .attr(
            "fill",
            "#ff9500"
          );


        seasonLabels
          .transition()
          .duration(350)
          .attr(
            "y",
            d =>
              ySeasonVol(
                d.avgVolume
              ) - 7
          )
          .attr(
            "fill",
            "#ff9500"
          )
          .text(
            d =>
              d3.format(".2s")(
                d.avgVolume
              )
          );
      }
    };


// ==========================================
// Tooltip Position
// ==========================================

function moveTooltip(event) {

  tooltip
    .style(
      "left",
      `${event.pageX + 15}px`
    )
    .style(
      "top",
      `${event.pageY - 20}px`
    );
}


// ==========================================
// Reset Chart Style
// ==========================================

function resetHighlights() {

  dots
    .attr("r", 3)
    .attr("fill", "#0071e3")
    .attr("stroke", "none");


  bars
    .attr("fill", "#34c759")
    .attr("opacity", 0.75)
    .attr("stroke", "none");


  seasonBars
    .attr("opacity", 0.85)
    .attr("stroke", "none")
    .attr("stroke-width", 0);


  linePointer
    .style(
      "opacity",
      0
    );


  barPointer
    .style(
      "opacity",
      0
    );
}


// ==========================================
// Highlight by Date
// ==========================================

function highlightDate(d) {

  const dateStr =
    formatMonth(d.Year_Month);


  // PRICE
  dots
    .attr(
      "r",
      p =>
        formatMonth(
          p.Year_Month
        ) === dateStr
          ? 7
          : 3
    )
    .attr(
      "fill",
      p =>
        formatMonth(
          p.Year_Month
        ) === dateStr
          ? "#ff3b30"
          : "#0071e3"
    )
    .attr(
      "stroke",
      p =>
        formatMonth(
          p.Year_Month
        ) === dateStr
          ? "#1d1d1f"
          : "none"
    )
    .attr(
      "stroke-width",
      2
    );


  // VOLUME
  bars
    .attr(
      "fill",
      p =>
        formatMonth(
          p.Year_Month
        ) === dateStr
          ? "#1b8a3e"
          : "#34c759"
    )
    .attr(
      "opacity",
      p =>
        formatMonth(
          p.Year_Month
        ) === dateStr
          ? 1
          : 0.55
    )
    .attr(
      "stroke",
      p =>
        formatMonth(
          p.Year_Month
        ) === dateStr
          ? "#1d1d1f"
          : "none"
    )
    .attr(
      "stroke-width",
      1
    );


  // SEASONALITY
  seasonBars
    .attr(
      "opacity",
      p =>
        p.monthIndex ===
        d.Month_Index
          ? 1
          : 0.25
    )
    .attr(
      "stroke",
      p =>
        p.monthIndex ===
        d.Month_Index
          ? "#1d1d1f"
          : "none"
    )
    .attr(
      "stroke-width",
      p =>
        p.monthIndex ===
        d.Month_Index
          ? 2
          : 0
    );


  // POINTERS
  const x =
    currentXScale(
      d.Year_Month
    );


  linePointer
    .attr("x1", x)
    .attr("x2", x)
    .style(
      "opacity",
      1
    );


  barPointer
    .attr("x1", x)
    .attr("x2", x)
    .style(
      "opacity",
      1
    );
}


// ==========================================
// Tooltip - Normal Data
// ==========================================

function showDataTooltip(
  event,
  d
) {

  highlightDate(d);


  tooltip
    .style(
      "opacity",
      1
    )
    .html(`
      <div class="tooltip-title">
        ${d3.timeFormat("%B %Y")(d.Year_Month)}
      </div>

      <div>
        Average Price:
        <b>$${d.Avg_Close.toFixed(2)}</b>
      </div>

      <div>
        Total Volume:
        <b>${d3.format(",")(d.Total_Volume)}</b>
      </div>

      <div class="tooltip-sub">
        ${monthNames[d.Month_Index]}
      </div>
    `);


  moveTooltip(event);
}


// ==========================================
// Tooltip - Seasonality
// ==========================================

function showSeasonTooltip(
  event,
  d
) {

  // Highlight Seasonality
  seasonBars
    .attr(
      "opacity",
      p =>
        p.monthIndex ===
        d.monthIndex
          ? 1
          : 0.25
    )
    .attr(
      "stroke",
      p =>
        p.monthIndex ===
        d.monthIndex
          ? "#1d1d1f"
          : "none"
    )
    .attr(
      "stroke-width",
      p =>
        p.monthIndex ===
        d.monthIndex
          ? 2
          : 0
    );


  // Highlight ALL corresponding months
  dots
    .attr(
      "r",
      p =>
        p.Month_Index ===
        d.monthIndex
          ? 5
          : 3
    )
    .attr(
      "fill",
      p =>
        p.Month_Index ===
        d.monthIndex
          ? "#ff3b30"
          : "#0071e3"
    );


  bars
    .attr(
      "fill",
      p =>
        p.Month_Index ===
        d.monthIndex
          ? "#1b8a3e"
          : "#34c759"
    )
    .attr(
      "opacity",
      p =>
        p.Month_Index ===
        d.monthIndex
          ? 1
          : 0.45
    );


  tooltip
    .style(
      "opacity",
      1
    )
    .html(`
      <div class="tooltip-title">
        ${d.monthName}
      </div>

      <div>
        Average Price:
        <b>$${d.avgPrice.toFixed(2)}</b>
      </div>

      <div>
        Average Volume:
        <b>${d3.format(",")(Math.round(d.avgVolume))}</b>
      </div>

      <div class="tooltip-sub">
        ค่าเฉลี่ยย้อนหลังของเดือนนี้
      </div>
    `);


  moveTooltip(event);
}


// ==========================================
// Hover Price / Volume
// ==========================================

dots
  .on(
    "mouseenter",
    showDataTooltip
  )
  .on(
    "mousemove",
    moveTooltip
  )
  .on(
    "mouseleave",
    () => {

      tooltip.style(
        "opacity",
        0
      );

      if (!activeEventDate) {
        resetHighlights();
      }

    }
  );


bars
  .on(
    "mouseenter",
    showDataTooltip
  )
  .on(
    "mousemove",
    moveTooltip
  )
  .on(
    "mouseleave",
    () => {

      tooltip.style(
        "opacity",
        0
      );

      if (!activeEventDate) {
        resetHighlights();
      }

    }
  );


// ==========================================
// Click Price / Volume
// ==========================================

dots.on(
  "click",
  (event, d) => {

    activeEventDate =
      formatMonth(
        d.Year_Month
      );

    highlightDate(d);

  }
);


bars.on(
  "click",
  (event, d) => {

    activeEventDate =
      formatMonth(
        d.Year_Month
      );

    highlightDate(d);

  }
);


// ==========================================
// Seasonality Hover / Click
// ==========================================

seasonBars
  .on(
    "mouseenter",
    showSeasonTooltip
  )
  .on(
    "mousemove",
    moveTooltip
  )
  .on(
    "mouseleave",
    () => {

      tooltip.style(
        "opacity",
        0
      );

      if (!activeEventDate) {
        resetHighlights();
      }

    }
  );


seasonBars.on(
  "click",
  (event, d) => {

    activeSeasonMonth =
      d.monthIndex;

    seasonBars
      .attr(
        "opacity",
        p =>
          p.monthIndex ===
          d.monthIndex
            ? 1
            : 0.25
      );

    dots
      .attr(
        "r",
        p =>
          p.Month_Index ===
          d.monthIndex
            ? 6
            : 3
      );

    bars
      .attr(
        "opacity",
        p =>
          p.Month_Index ===
          d.monthIndex
            ? 1
            : 0.45
      );

  }
);


// ==========================================
// Events
// ==========================================

selectEventFn =
  eventId => {

    activeEventDate =
      eventId;

    const ev =
      events.find(
        e => e.id === eventId
      );

    if (!ev) return;

    const eventDate =
      parseDate(ev.date);

    const matchedData =
      data.find(
        d =>
          formatMonth(
            d.Year_Month
          ) === ev.date
      );

    if (matchedData) {

      highlightDate(
        matchedData
      );

      tooltip
        .style(
          "opacity",
          1
        )
        .html(`
          <div class="tooltip-title">
            ${ev.title}
          </div>

          <div>
            Date:
            <b>${ev.date}</b>
          </div>

          <div>
            Average Price:
            <b>$${matchedData.Avg_Close.toFixed(2)}</b>
          </div>

          <div>
            Total Volume:
            <b>${d3.format(",")(matchedData.Total_Volume)}</b>
          </div>

          <div class="tooltip-sub">
            ${ev.desc}
          </div>
        `);

    }


    d3.selectAll(
      ".event-chip"
    )
      .classed(
        "active",
        false
      );


    d3.selectAll(
      ".event-chip"
    )
      .filter(
        function () {

          return this.textContent
            .includes(ev.date);

        }
      )
      .classed(
        "active",
        true
      );

  };


// ==========================================
// Zoom / Pan
// ==========================================

let isZooming = false;

const sharedZoom =
  d3.zoom()
    .scaleExtent([1, 12])
    .translateExtent([
      [0, 0],
      [
        innerWidth,
        innerHeight
      ]
    ])
    .extent([
      [0, 0],
      [
        innerWidth,
        innerHeight
      ]
    ])
    .on(
      "zoom",
      event => {

        if (isZooming) return;

        isZooming = true;

        currentXScale =
          event.transform
            .rescaleX(
              xBase
            );


        // PRICE AXIS
        xAxisLine.call(
          d3.axisBottom(
            currentXScale
          )
            .ticks(6)
            .tickFormat(
              d3.timeFormat("%Y")
            )
        );


        gridXLine.call(
          d3.axisBottom(
            currentXScale
          )
            .ticks(6)
            .tickSize(
              -innerHeight
            )
            .tickFormat("")
        );


        // VOLUME AXIS
        xAxisBar.call(
          d3.axisBottom(
            currentXScale
          )
            .ticks(6)
            .tickFormat(
              d3.timeFormat("%Y")
            )
        );


        gridXBar.call(
          d3.axisBottom(
            currentXScale
          )
            .ticks(6)
            .tickSize(
              -innerHeight
            )
            .tickFormat("")
        );


        // PRICE LINE
        path.attr(
          "d",
          d3.line()
            .x(
              d =>
                currentXScale(
                  d.Year_Month
                )
            )
            .y(
              d =>
                yLine(
                  d.Avg_Close
                )
            )
            .curve(
              d3.curveMonotoneX
            )
        );


        // PRICE DOTS
        dots.attr(
          "cx",
          d =>
            currentXScale(
              d.Year_Month
            )
        );


        // VOLUME
        const newBarWidth =
          Math.max(
            1,
            (innerWidth /
              data.length) *
              event.transform.k -
              0.5
          );


        bars
          .attr(
            "x",
            d =>
              currentXScale(
                d.Year_Month
              ) -
              newBarWidth / 2
          )
          .attr(
            "width",
            newBarWidth
          );


        // Sync zoom
        if (event.sourceEvent) {

          const target =
            event.sourceEvent
              .target;

          if (
            target.closest(
              "#lineChart"
            )
          ) {

            svgBar.call(
              sharedZoom.transform,
              event.transform
            );

          } else if (
            target.closest(
              "#volumeChart"
            )
          ) {

            svgLine.call(
              sharedZoom.transform,
              event.transform
            );

          }

        }

        isZooming = false;

      }
    );


// ==========================================
// Invisible Zoom Areas
// ==========================================

bodyLine
  .append("rect")
  .attr(
    "width",
    innerWidth
  )
  .attr(
    "height",
    innerHeight
  )
  .attr(
    "fill",
    "none"
  )
  .attr(
    "pointer-events",
    "all"
  )
  .lower();


bodyBar
  .append("rect")
  .attr(
    "width",
    innerWidth
  )
  .attr(
    "height",
    innerHeight
  )
  .attr(
    "fill",
    "none"
  )
  .attr(
    "pointer-events",
    "all"
  )
  .lower();


svgLine.call(
  sharedZoom
);


svgBar.call(
  sharedZoom
);


// ==========================================
// Reset
// ==========================================

resetViewFn =
  () => {

    activeEventDate = null;
    activeSeasonMonth = null;

    resetHighlights();

    tooltip.style(
      "opacity",
      0
    );

    d3.selectAll(
      ".event-chip"
    )
      .classed(
        "active",
        false
      );


    svgLine
      .transition()
      .duration(500)
      .call(
        sharedZoom.transform,
        d3.zoomIdentity
      );


    svgBar
      .transition()
      .duration(500)
      .call(
        sharedZoom.transform,
        d3.zoomIdentity
      );

  };


// ==========================================
// Event Annotation Click
// ==========================================

annotationGroup
  .selectAll(
    ".annotation-circle, .annotation-text"
  )
  .on(
    "click",
    (event) => {

      const eventId =
        d3.select(
          event.currentTarget
        )
        .attr(
          "data-id"
        );

      selectEventFn(
        eventId
      );

    }
  );


// ==========================================
// Initial Seasonality
// ==========================================

toggleSeasonMetric(
  "price"
);

}


// ==========================================
// Global Functions
// ==========================================

function selectEvent(eventId) {

  if (selectEventFn) {

    selectEventFn(
      eventId
    );

  }

}


function resetView() {

  if (resetViewFn) {

    resetViewFn();

  }

}