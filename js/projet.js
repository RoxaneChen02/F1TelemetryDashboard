const ctx = {
    driver_colors : {'alexander albon': '#005aff', 'carlos sainz': '#ff8181', 'charles leclerc': '#dc0000', 'daniel ricciardo': '#2b4562', 'esteban ocon': '#70c2ff', 'felipe drugovich': '#2f9b90', 'fernando alonso': '#006f62', 'frederik vesti': '#00a6ff', 'george russell': '#24ffff', 'isack hadjar': '#1e6176', 'jack doohan': '#0075c2', 'jake dennis': '#9f99e2', 'kevin magnussen': 'gray', 'lance stroll': '#25a617', 'lando norris': '#eeb370', 'lewis hamilton': '#00d2be', 'liam lawson': '#2b4562', 'logan sargeant': '#012564', 'max verstappen': '#0600ef', 'nico hulkenberg': 'black', 'nyck de vries': '#1e3d61', 'oliver bearman': '#c40000', 'oscar piastri': '#ff8700', 'pato oward': '#ee6d3a', 'pierre gasly': '#0090ff', 'robert shwartzman': '#9c0000', 'sergio perez': '#716de2', 'theo pourchaire': '#700000', 'valtteri bottas': '#900000', 'yuki tsunoda': '#356cac', 'zak osullivan': '#1b3d97', 'zhou guanyu': '#500000'},
    driver_translate: {'ALB': 'alexander albon', 'ALO': 'fernando alonso', 'BEA': 'oliver bearman', 'BOT': 'valtteri bottas', 'DEN': 'jake dennis', 'DEV': 'nyck de vries', 'DOO': 'jack doohan', 'DRU': 'felipe drugovich', 'GAS': 'pierre gasly', 'HAD': 'isack hadjar', 'HAM': 'lewis hamilton', 'HUL': 'nico hulkenberg', 'LAW': 'liam lawson', 'LEC': 'charles leclerc', 'MAG': 'kevin magnussen', 'NOR': 'lando norris', 'OCO': 'esteban ocon', 'OSU': 'zak osullivan', 'OWA': 'pato oward', 'PER': 'sergio perez', 'PIA': 'oscar piastri', 'POU': 'theo pourchaire', 'RIC': 'daniel ricciardo', 'RUS': 'george russell', 'SAI': 'carlos sainz', 'SAR': 'logan sargeant', 'SHW': 'robert shwartzman', 'STR': 'lance stroll', 'TSU': 'yuki tsunoda', 'VER': 'max verstappen', 'VES': 'frederik vesti', 'ZHO': 'zhou guanyu'},
    compound_colors : {'HARD': 'red','MEDIUM':'orange', 'SOFT':'yellow', 'WET': 'blue'},
    time_parser: d3.timeParse("%Y-%m-%d %H:%M:%S.%L"),
    time_parser2: d3.timeParse("%H:%M:%S.%f"),
    index :new Array(20).fill(0),
    lapSelected: 1, //by default display first lap
};

//Called every time we want to load a new race
function loadData() {
  d3.select("img#inProg").style("visibility", "visible");
  d3.csv(`../data/${ctx.season}/${ctx.race}/session_laps_info.csv`).then(function(session_info){
      // Get list of all the driver
      ctx.drivers =  Array.from(new Set(session_info.map(d=> d.Driver)))

      data = [d3.csv(`../data/${ctx.season}/${ctx.race}/circuit_trace.csv`), 
                d3.csv(`../data/${ctx.season}/${ctx.race}/session_result.csv`)]

      // init driver_filter to zero by default no driver selected 
      ctx.driver_filter = {}
      ctx.drivers.forEach(d=>{
        data.push(d3.csv(`../data/${ctx.season}/${ctx.race}/telemetry/`+d+"_telemetry.csv"));
        ctx.driver_filter[d] = 0
      })
        
      Promise.all(data).then(function(data){
        session_result = data[1]
        telemetry = data.slice(2,22)
        
        // for each driver => a list with startTime for each lap the driver completed
        ctx.lapTimeList=[] 
        ctx.drivers.forEach(driver=>{
          
          temp = session_info.filter(d=> d.Driver==driver && ctx.time_parser(d.LapStartDate)!= null && ctx.time_parser2(d.LapTime.split(" ")[2]) != null)
                              .map(d=>({LapStartDate: ctx.time_parser(d.LapStartDate)}))
          ctx.lapTimeList.push(temp)
        })

        //some processing of the data
        telemetry.forEach((element,i)=>{
          element.forEach(d=> {d.Time = ctx.time_parser2(d.Time.split(" ")[2])})
        })

        // get total number of laps
        ctx.n_laps = Math.max(...session_info.map(d=> d.LapNumber))

        // create ctx.bestLapTimePerDriver
        getBestLapTime(session_info)

        createCheckboxes()
        createLapTimeChartHeader()
        createCompoundLegend()

        container = document.createElement("div")
        container.id = "tableAndLapChartContainer"
        container.style.display = 'flex';
        container.style.marginBottom = '50px'
        container.style.justifyContent = 'space-evenly';
        document.getElementById("body").appendChild(container)

        createLapTimeChart(session_info, telemetry)
        createDriverTable(session_result)

        createLapSelectedDisplay()

        container = document.createElement("div")
        container.id = "circuitAndTelemetryCharts"
        container.style.display = 'flex';
        container.style.justifyContent = 'space-evenly';
        container.style.marginBottom = '50px'
        document.getElementById("body").appendChild(container)

        createCircuit(data[0])
        getLapData(telemetry)
        createChart(session_info, telemetry)
        createShowLegendCheckBox()
        createReplayButton()
        createTelemetryChartsTooltip()
        d3.select("img#inProg").style("visibility", "hidden");
      });
      
    })
   
};

function createViz() {
    console.log("Using D3 v" + d3.version);
    createHeader()
    createSeasonSelector()
};

function createHeader() {

  document.getElementById("header").style.marginTop = "30px"
  var svg = d3.select("#header")
    .append("svg")
    .attr("width", 1800)
    .attr("height", 70)

  // Add a logo on the left
  svg.append("image")
    .attr("xlink:href", "../F1_logo.png") 
    .attr("width", 200) 
    .attr("height", 70) 
    .attr("x", 30) 
    .attr("y", 0); 

  // Add text to the center of the SVG
  svg.append("text")
    .attr("x", 900)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "black")
    .style("font-family", "Impact, fantasy")
    .style("font-size", "70px")
    .text("Telemetry Dashboard");
}

// CHECKBOXES

function createCheckboxes() {
    // Get the container element
    var container = document.createElement("div");
    document.getElementById("body").appendChild(container)
    container.id = "checkboxContainer"
    container.style.marginTop = '20px'
    container.style.marginBottom = '20px'
    container.style.marginLeft = ' 20px'
    container.style.display = 'flex';
    container.style.justifyContent = 'space-evenly';
    
    // Loop through the drivers
    driver_in_order = ctx.drivers.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    driver_in_order.forEach(function (driver) {

      // Create checkbox div with Bootstrap form-check class
      var checkboxDiv = document.createElement("div");
      checkboxDiv.className = "form-check form-check-inline col";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "form-check-input";
      checkbox.value = driver
      checkbox.checked = false;

      var label = document.createElement("label");
      label.className = "form-check-label";
      label.style.color = ctx.driver_colors[ctx.driver_translate[driver]];
      label.style.font = "14px 'Segoe UI', sans-serif";
      label.appendChild(document.createTextNode(driver));

      // Append checkbox input, label, and line break to the checkbox div
      checkboxDiv.appendChild(checkbox);
      checkboxDiv.appendChild(label);

      checkboxDiv.style.marginRight = "10px";
      
      // Append the checkbox div to the container
      container.appendChild(checkboxDiv);

      // Attach change event listener to all checkboxes
      d3.selectAll(".form-check-input").on("change", checkBoxUpdate);
  });
}

function checkBoxUpdate(){
    // For each check box:
    d3.selectAll(".form-check-input").each(function(d){
      cb = d3.select(this);
      driver = cb.property("value")

      
      if(cb.property("checked")){
        d3.select("#map").selectAll("#"+driver).attr("opacity", 1)
        d3.select("#telemetryChart").selectAll("#"+driver).attr("opacity", 1)
        d3.select("#lapTimeChart").selectAll("#"+driver).attr("opacity", 1)
        d3.select("#lapTimeChart").selectAll(".myCircle #"+driver).attr("opacity", 1)
        ctx.driver_filter[driver]=1
      }
      else{
        d3.select("#map").selectAll("#"+driver).attr("opacity", 0)
        d3.select("#telemetryChart").selectAll("#"+driver).attr("opacity", 0)
        d3.select("#lapTimeChart").selectAll("#"+driver).attr("opacity", 0)
        d3.select("#lapTimeChart").selectAll(".myCircle #"+driver).attr("opacity", 0)
        ctx.driver_filter[driver]=0
      }
    })
}

//DROPDOWN

function createDropdown(id, options, onChangeCallback) {
  var dropdown = document.createElement("select");
  dropdown.id = id;
  dropdown.className = "form-control"; 

  // Create and add a disabled placeholder option
  var placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.text = "Please select a season";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  dropdown.appendChild(placeholderOption);

  // Create and add options to the dropdown
  options.forEach(function(option) {
    var optionElement = document.createElement("option");
    optionElement.value = option;
    optionElement.text = option;
    dropdown.appendChild(optionElement);
  });

  // Add an onclick event listener to the dropdown
  dropdown.onchange = function() {
    if (onChangeCallback && typeof onChangeCallback === 'function') {
      onChangeCallback(dropdown.value); // Pass the selected value to the callback function
    }
  };

  return dropdown;
}

function dropdownSeasonChangeCallback(selectedValue) {
  ctx.season = selectedValue
  d3.csv(`../data/${selectedValue}/race_schedule.csv`).then(function(data){

    // Get the Race Circuit dropdown element
    var raceCircuitDropdown = document.getElementById("raceCircuitDropdown");

    // Clear existing options
    raceCircuitDropdown.innerHTML = "";
    
    // Create and add a disabled placeholder option
    var placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.text = "Please select a race";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    raceCircuitDropdown.appendChild(placeholderOption);

    // Create and add new options to the Race Circuit dropdown
    data.forEach(function(d,i) {
      var optionElement = document.createElement("option");
      optionElement.value = d.round;
      optionElement.text = d.raceName;
      optionElement.disabled = (selectedValue == "2023" && i<2) ? false : true;
      raceCircuitDropdown.appendChild(optionElement);
    });

  })
}

function dropdownRaceChangeCallback(selectedValue) {
  ctx.race = selectedValue
  var parentContainer = document.getElementById("body");
  // Remove all children using innerHTML
  parentContainer.innerHTML = "";
  loadData()
}

function createSeasonSelector(){

  var seasons = ["2023"];

  // Get the raceSelectionContainer element
  var container = document.getElementById("raceSelectionContainer");
  container.style.display = 'flex';
  container.style.justifyContent = 'space-evenly';
  container.style.marginTop = "20px"
  container.style.marginBottom = "20px"
  container.style.marginLeft = "20px"
  container.style.marginRight = "20px"

  var inProgImage = document.createElement('img');
  inProgImage.src = '../data/inProgress@2x.gif';
  inProgImage.id = 'inProg';
  inProgImage.style.visibility = 'hidden';
  inProgImage.width = 30;
  inProgImage.height = 30;
  inProgImage.alt = 'in progress...';
  container.appendChild(inProgImage);

  // Create and append the Season dropdown
  var seasonDropdown = createDropdown("seasonDropdown", seasons, dropdownSeasonChangeCallback);
  container.appendChild(seasonDropdown);

  var raceCircuitDropdown = createDropdown("raceCircuitDropdown", [], dropdownRaceChangeCallback);
  container.appendChild(raceCircuitDropdown);

  container.appendChild(inProgImage);
}

//LAPTIME CHART

function createLapTimeChartHeader(){
  container = document.createElement("div")
  container.id = "lapTimeChartHeader"
  document.getElementById("body").appendChild(container)

  var svg = d3.select("#lapTimeChartHeader")
    .append("svg")
    .attr("width", 1800)
    .attr("height", 100)
    .style("background-color", "white"); 

  svg.append("text")
    .attr("x", 30) 
    .attr("y", 50)  
    .attr("fill", "#606060") 
    .style("font-family", "Impact, fantasy")
    .style("font-size", "40px")
    .text("Lap Time Chart");

    svg.append("text")
    .attr("x", 1230) 
    .attr("y", 50)  
    .attr("fill", "#606060") 
    .style("font-family", "Impact, fantasy")
    .style("font-size", "40px")
    .text("Driver Ranking");
}

function createCompoundLegend(){

  var compoundLegend = document.createElement("div");
  compoundLegend.id = "compoundLegend"
  compoundLegend.style.height = "30px"

  document.getElementById("body").appendChild(compoundLegend)

  svg = d3.select("#compoundLegend").append('svg').attr("width",1800).attr("height",30)

  svg.append('text')
      .attr('x', 20)
      .attr('y', 15)
      .attr('fill', "black")
      .attr('text-anchor', 'start')
      .style("font-family", "Arial")
      .style("font-size", "15px")
      .text("Compound Legend : ");

    svg.append('circle')
      .attr('cx', 170)
      .attr('cy', 10)
      .attr('r',6)
      .attr('fill', "red")
      .attr("stroke","black")

    svg.append('text')
      .attr('x', 180)
      .attr('y', 15)
      .attr('text-anchor', 'start')
      .attr('fill', "black")
      .style("font-family", "Arial")
      .style("font-size", "15px")
      .text("HARD");

    svg.append('circle')
      .attr('cx', 280)
      .attr('cy', 10)
      .attr('r',6)
      .attr('fill', "orange")
      .attr("stroke","black")
    
    svg.append('text')
      .attr('x', 290)
      .attr('y', 15)
      .attr('text-anchor', 'start')
      .attr('fill', "black")
      .style("font-family", "Arial")
      .style("font-size", "15px")
      .text("MEDIUM");

    svg.append('circle')
      .attr('cx', 390)
      .attr('cy', 10)
      .attr('r',6)
      .attr('fill', "yellow")
      .attr("stroke","black")
    
    svg.append('text')
      .attr('x', 400)
      .attr('y', 15)
      .attr('fill', "black")
      .attr('text-anchor', 'start')
      .style("font-family", "Arial")
      .style("font-size", "15px")
      .text("SOFT");

      svg.append('circle')
      .attr('cx', 500)
      .attr('cy', 10)
      .attr('r',6)
      .attr('fill', "blue")
      .attr("stroke","black")
    
    svg.append('text')
      .attr('x', 510)
      .attr('y', 15)
      .attr('fill', "black")
      .attr('text-anchor', 'start')
      .style("font-family", "Arial")
      .style("font-size", "15px")
      .text("WET");
}

function createLapTimeChart(session_info, telemetry){
  
  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 30, bottom: 30, left: 60},
  width = 1200 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

  var container = document.createElement("div");
  document.getElementById("tableAndLapChartContainer").appendChild(container)
  container.id = "lapTimeChart"
  container.style.marginBottom = '20px'

  var svg = d3.select("#lapTimeChart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")")

  // data 
  var dataReady = []
  
  ctx.drivers.forEach(function(driver){
      info = session_info.filter(d => d.Driver == driver  && ctx.time_parser2(d.LapTime.split(" ")[2])!=null)
      dataReady.push({
        name: driver,
        values: info.map(element=>({LapNumber: element.LapNumber, 
                                    LapTime:ctx.time_parser2(element.LapTime.split(" ")[2]),
                                    Compound : element.Compound}))
      })
  })


  // Create x-axis : lap number
  var x = d3.scaleLinear()
    .domain([0, ctx.n_laps])
    .range([ 0, width ]);

  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  svg.append("text")             
  .attr("transform",
        "translate(" + (width/2) + " ," + 
                      (height + margin.top + 20) + ")")
  .style("text-anchor", "middle")
  .style("font-family", "Arial")
  .style("font-size", "12px")
  .text("Lap Number");

  //Create y-axis : Lap Time (mm:ss format)

  // Extract all time values from the dataset
  var allTimes = dataReady.flatMap(function(driverData) {
                  return driverData.values.map(function(d) {
                    return d.LapTime;});
                });

  // Calculate the time extent (min and max)
  var timeExtent = d3.extent(allTimes);

  var y = d3.scaleTime()
      .domain(timeExtent)
      .range([ height, 0 ]);
  
  svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d3.timeFormat("%M:%S")).ticks(d3.timeSecond.every(10)));

  // Append Y axis label
  svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - margin.left)
  .attr("x", 0 - (height / 2))
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .style("font-family", "Arial")
  .style("font-size", "12px")
  .text("Lap Time (mm:ss)");

  // Add the lines

  var line = d3.line()
  .curve(d3.curveMonotoneX )
  .x(function(d) { return x(d.LapNumber) })
  .y(function(d) {return d.LapTime !== null && d.LapTime !== undefined ? y(d.LapTime) : null;})

  svg.selectAll("myLines")
    .data(dataReady)
    .enter()
    .append("path")
      .attr("d", function(d){ return line(d.values) } )
      .attr("id",d=>d.name)
      .attr("stroke", function(d){ return  ctx.driver_colors[ctx.driver_translate[d.name]] || "black"})
      .style("stroke-width", 1)
      .style("fill", "none")
      .attr("opacity", function (d) { return ctx.driver_filter[d.name] === 0 ? 0 : 1; })


  // Flatten the nested array structure using d3.merge
  var flattenedData = d3.merge(dataReady.map(function(d) {
    return d.values.map(function(e) {
      return Object.assign({}, e, { name: d.name });
    });
  }));

  // Add the points (circles)
  svg.append("g")
    .selectAll("dot")
    .data(flattenedData)
    .enter()
    .append("circle")
      .attr("class", "myCircle")
      .attr("id", d=> d.name)
      .attr("cx", function(d) { return x(d.LapNumber); })
      .attr("cy", function(d) { return y(d.LapTime); })
      .attr("r", 2)
      .attr("stroke", function(d) { return ctx.driver_colors[ctx.driver_translate[d.name]]; })
      .attr("fill", function(d) { return ctx.compound_colors[d.Compound] })
      .attr("opacity", function (d) { return ctx.driver_filter[d.name] === 0 ? 0 : 1; })

  // Create a tooltip
  var tooltip = svg.append("g")
  .attr("class", "tooltip")
  .style("opacity", 0);

  tooltip.append("line")
  .attr("class", "tooltip-line")
  .style("stroke", "black")
  .style("stroke-width", 1)
  .style("pointer-events", "none");

  d3.select("#lapTimeChart").append("div")
  .attr("class", "tooltip-text")
  .style("pointer-events", "none")
  .style("background-color", "white")
  .style("border", "solid")
  .style("border-width", "2px")
  .style("border-radius", "5px")
  .style("padding", "5px")
  .style("position", "absolute")
  .style("opacity",0.4);

  // Add a transparent overlay for mouse events
  svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .style("fill", "none")
  .style("pointer-events", "all")
  .on("mouseover", function () { tooltip.style("opacity", 1); d3.select(".tooltip-text").style("opacity", 0.6); })
  .on("mousemove", mousemove)
  .on("click", mousemove);

  function mousemove(event) {

    // Find the corresponding LapNumber for the current mouse position
    var mouseX = x.invert(d3.pointer(event)[0]);
    currentLapNumber = Math.round(mouseX)
    currentData = flattenedData.filter(element=> parseInt(element.LapNumber) == currentLapNumber)

    // Update the tooltip line and text position
    tooltip.select(".tooltip-line")
      .attr("x1", x(currentLapNumber))
      .attr("x2", x(currentLapNumber))
      .attr("y1", 0)
      .attr("y2", height)

    textDisplay = `Lap Number: ${parseInt(currentData[0].LapNumber)}<br> <br>`
    currentData.forEach(element=>{
      if (ctx.driver_filter[element.name]==1){
        const driverColor = ctx.driver_colors[ctx.driver_translate[element.name]] || "black";
        textDisplay += `<span style="color: ${driverColor};">${element.name}: ${element.LapTime.getMinutes()}:${element.LapTime.getSeconds()}.${element.LapTime.getMilliseconds()}</span><br> `;
      }
    })

    //make text appear
    d3.select(".tooltip-text")
      .html(textDisplay)
      .style("left", (event.x - 80) + "px")
      .style("top", (event.y ) + "px")
      .style("display", "block");

    //change selected data circle's size
    svg.selectAll(".myCircle")
      .attr("r", function(d) {
        return (d.LapNumber == currentLapNumber && ctx.driver_filter[d.name] == 1) ? 6 : 2;
      })

    // Update ctx.lapSelected when the tooltip line is clicked
    if (event.type === 'click') {

      // Update ctx.lapSelected when the tooltip line is clicked
      ctx.lapSelected = currentLapNumber;
      // Remove old charts, replace with charts corresponding to new lap selected
      updateChart(telemetry)
      d3.selectAll(".tooltip-text-telemetry").remove()
      createTelemetryChartsTooltip()
    }
  }
}

// TABLE

//init ctx.bestLapTimePerDriver
function getBestLapTime(session_info){
  ctx.bestLapTimePerDriver = {}
  ctx.drivers.forEach(function(driver){
    info = session_info.filter(d => d.Driver == driver && ctx.time_parser2(d.LapTime.split(" ")[2]) != null);
    
    // Sort the info array based on LapTime
    info.sort((a, b) => lapTimeToMilliseconds(a.LapTime) - lapTimeToMilliseconds(b.LapTime));

    // Get the best lap time and corresponding lap number
    const bestLap = info[0];

    ctx.bestLapTimePerDriver[driver] = {
        LapNumber: bestLap.LapNumber,
        LapTime: bestLap.LapTime.split(" ")[2].slice(3,12),
        Compound: bestLap.Compound
    };
  });

}

function createDriverTable(result) {

  //Create container
  container = document.createElement("div");
  container.id = "positionTable"; 
  container.style.marginRight = "30px"
  document.getElementById('tableAndLapChartContainer').appendChild(container);

  // Extract names and related information 
  var data = result.map(function(d,i){
    if(d.Status == "Finished"){
      if (i==0){
        return { name: d.LastName, time: d.Time.split(" ")[2].slice(0,12), team: d.TeamName, gridPosition: parseInt(d.GridPosition), bestLap : "N°"+ parseInt(ctx.bestLapTimePerDriver[d.Abbreviation].LapNumber) + ': '+ctx.bestLapTimePerDriver[d.Abbreviation].LapTime}
      }
      else {
        return { name: d.LastName, time:"+"+d.Time.split(" ")[2].slice(3,12), team: d.TeamName, gridPosition: parseInt(d.GridPosition), bestLap : "N°"+ parseInt(ctx.bestLapTimePerDriver[d.Abbreviation].LapNumber) + ': '+ctx.bestLapTimePerDriver[d.Abbreviation].LapTime }
      }
    }
    else {
      return { name: d.LastName, time:d.Status, team: d.TeamName, gridPosition:parseInt(d.GridPosition), bestLap : "N°"+ parseInt(ctx.bestLapTimePerDriver[d.Abbreviation].LapNumber) + ': '+ctx.bestLapTimePerDriver[d.Abbreviation].LapTime}
    }
    
  });

  // Define the data for the table
  data = data.map(driver => [driver.name, driver.team, driver.time, driver.bestLap]);

  // Define the columns
  columns = [
    { name: 'Driver', label: 'Driver', width:110  },
    { name: 'Team', label: 'Team', width:130  },

    { name: 'Total Time', label: 'Total Time', width:130 },
    { name: 'Best Lap', label: 'Best Lap' , width:160, wrapHeader: true},
  ];

  // Create the table using Grid.js
  new gridjs.Grid({
    columns: columns,
    data: data,
    fixedHeader: true,
    height: '500px',
    width: '550px',
  }).render(container);
}

function createLapSelectedDisplay(){
  container = document.createElement("div")
  container.id = "lapSelectedDisplay"
  document.getElementById("body").appendChild(container)

  var svg = d3.select("#lapSelectedDisplay")
    .append("svg")
    .attr("width", 1800)
    .attr("height", 100)
    .style("background-color", "white"); 

  svg.append("text")
    .attr("x", 30) 
    .attr("y", 50)  
    .attr("fill", "#606060") 
    .style("font-family", "Impact, fantasy")
    .style("font-size", "40px")
    .text("Telemetry Charts For Lap: 1 (Default)");
  
  svg.append("text")
    .attr("x", 30) 
    .attr("y", 80)  
    .attr("fill", "#606060") 
    .style("font-family", "Arial")
    .style("font-size", "20px")
    .text("Please click on the lap time chart to select a lap to analyze");
    
}

// CIRCUIT

function createCircuit(data){
    margin = {top:60, bottom:10, right : 10, left:10}
    width = 600 
    height = 600 
    container = document.createElement("div")
    container.id = "mapContainer"
    document.getElementById("circuitAndTelemetryCharts").appendChild(container)
    
    ctx.yScale = d3.scaleLinear().domain([d3.min(data, ((d) => parseFloat(d.Y))), d3.max(data, ((d) => parseFloat(d.Y)))])
                                 .range([height-margin.bottom,margin.top]);
    ctx.xScale = d3.scaleLinear().domain([d3.min(data, ((d) => parseFloat(d.X))), d3.max(data, ((d) => parseFloat(d.X)))])
                                 .range([margin.left,width-margin.right]);


    const path = d3.select("#mapContainer").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("id","map")
    .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#cac7c7")
        .attr("stroke-width", 10)
        .attr("d", d3.line()
            .x(function(d){return ctx.xScale(d.X)})
            .y(function(d){return ctx.yScale(d.Y)})
        );
      
}
//add driver position to the map
function addDriverPositionOnMap(data, driver, transitionDuration){
    d3.select("#map").selectAll("#"+driver)
        .data(data)
        .join(
            enter => (
                enter.append("circle")
                .datum(data)
                .attr('id',driver)
                .attr("fill", ctx.driver_colors[ctx.driver_translate[driver]])
                .attr("stroke", ctx.driver_colors[ctx.driver_translate[driver]])
                .attr("stroke-width", 2)
                .attr("r",3)
                .attr("cx",d=> ctx.xScale(d.X))
                .attr("cy",d=> ctx.yScale(d.Y))
                .attr("opacity", function (d) { return ctx.driver_filter[driver] === 0 ? 0 : 1; })
            ),
            update => {
                update
                .transition()
                .duration(transitionDuration)
                .attr("cx",d=>  ctx.xScale(d.X))
                .attr("cy",d=> ctx.yScale(d.Y))
                .attr("opacity", function (d) { return ctx.driver_filter[driver] === 0 ? 0 : 1; })
            },
            exit => (
                exit.remove()
            )
        );

}

function createReplayButton(){
  buttonContainer = document.createElement("div")
  buttonContainer.style.marginTop = '50px'
  buttonContainer.style.display = 'flex';
  document.getElementById("mapContainer").appendChild(buttonContainer);

  let button = document.createElement("button");
  button.type = "button";
  button.id = "button"
  button.textContent = "Start Replay";
  button.style.marginTop = "50 px"

  buttonContainer.appendChild(button)

  button.onclick = function() {
        if (ctx.planeUpdater==null){

          d3.selectAll(".tooltip-text-telemetry")
          .style("opacity",0)

            startPositionUpdater(ctx.lapData);
            button.textContent = "Pause Replay"
        }
        else {
            clearInterval(ctx.planeUpdater);
            ctx.planeUpdater = null
            //restart everything from the beginning 
            ctx.index = new Array(20).fill(0)
            button.textContent = "Start Replay"
        }
    };
    
}

// TELEMETRY CHARTS

// init ctx.lapData[driver] = data of the selected lap
function getLapData(telemetry){

  ctx.lapData = []
  telemetry.forEach((element,i)=>{
    // only if driver completed this lap 
    if (ctx.lapTimeList[i].length >= ctx.lapSelected){
      if (ctx.lapSelected == 1){
        ctx.lapData.push(element.filter(d=>d.Time != null & ctx.time_parser(d.Date).getTime() < ctx.lapTimeList[i][ctx.lapSelected]['LapStartDate'].getTime()))
      }
      else if (ctx.lapSelected == ctx.lapTimeList[i].length){
        ctx.lapData.push(element.filter(d=>d.Time != null & ctx.time_parser(d.Date).getTime() > ctx.lapTimeList[i][ctx.lapSelected-1]['LapStartDate'].getTime()))
      }
      else {
        
        ctx.lapData.push(element.filter(d=>d.Time != null 
          & ctx.time_parser(d.Date).getTime() > ctx.lapTimeList[i][ctx.lapSelected-1]['LapStartDate'].getTime()
          & ctx.time_parser(d.Date).getTime() < ctx.lapTimeList[i][ctx.lapSelected]['LapStartDate'].getTime()))
      }
    }
    else {
      ctx.lapData.push([])
    }
  })

}

function createChart(){

  var margin = {top: 10, right: 10, bottom: 30, left: 50},
  width = 700 - margin.left - margin.right,
  height = 200 - margin.top - margin.bottom;

  // create all the div
  chartContainer = document.createElement("div")
  chartContainer.id = "telemetryChart"
  document.getElementById("circuitAndTelemetryCharts").appendChild(chartContainer)

  speedContainer = document.createElement("div")
  speedContainer.id = "speedChart"
  chartContainer.appendChild(speedContainer)

  throttleContainer = document.createElement("div")
  throttleContainer.id = "throttleChart"
  chartContainer.appendChild(throttleContainer)

  brakeContainer = document.createElement("div")
  brakeContainer.id = "brakeChart"
  chartContainer.appendChild(brakeContainer)

  rpmContainer = document.createElement("div")
  rpmContainer.id = "rpmChart"
  chartContainer.appendChild(rpmContainer)

  drsContainer = document.createElement("div")
  drsContainer.id = "drsChart"
  chartContainer.appendChild(drsContainer)
  
  ngearContainer = document.createElement("div")
  ngearContainer.id = "ngearChart"
  chartContainer.appendChild(ngearContainer)

  // Reformat the data: we need an array of arrays of {x, y} tuples
  var dataReady = ctx.drivers.map( function(driver,i) {
      var times = ctx.lapData[i].map(function(d) {
        return d.Time;
      });

      // Find the smallest distance
      var minTime = d3.extent(times)[0];
      return {
        name: driver,
        values: ctx.lapData[i].map(function(d) {
                return {Time: d.Time-minTime , Speed: d.Speed, Throttle : d.Throttle, Brake: + (d.Brake=="True"), RPM: d.RPM, DRS : d.DRS, nGear: d.nGear, X: d.X, Y:d.Y};
        })
      };
  });

  ctx.dataReady = dataReady


  // Extract all time values from the dataset
  var allTimes = dataReady.flatMap(function(driverData) {
    return driverData.values.map(function(d) {
        return d.Time;
    });
  });
  
  // Calculate the time extent (min and max)
  var timeExtent = d3.extent(allTimes);
  
  // Add X axis --> it is a date format
  var x = d3.scaleTime()
        .domain(timeExtent)
        .range([ 0, width ]);
  ctx.xTime = x

  createSpeedChart(dataReady,x)
  createThrottleChart(dataReady,x)
  createBrakeChart(dataReady, x)
  createDRSChart(dataReady,x)
  createRPMChart(dataReady,x)
  createNGearChart(dataReady,x)

}

function createBrakeChart(dataReady, x){
  
  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 10, bottom: 10, left: 50},
  width = 700 - margin.left - margin.right,
  height = 100 - margin.top - margin.bottom;

  var brakeChart = d3.select("#brakeChart")
      .append("svg")
      .attr("id","brake")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");
  
  var yBrake = d3.scaleLinear()
      .domain( [0,1])
      .range([ height, 0 ]);

  brakeChart.append("g")
    .call(d3.axisLeft(yBrake).ticks(1));

  // Append Y axis label
  brakeChart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-family", "Arial")
    .style("font-size", "12px")
    .text("Brake");
  
  var lineT = d3.line()
    .x(function(d) { return x(d.Time) })
    .y(function(d) {return yBrake(d.Brake) })
  
  brakeChart.selectAll("myLines")
    .data(dataReady)
    .enter()
    .append("path")
      .attr("d", function(d){ return lineT(d.values) } )
      .attr("id",d=>d.name)
      .attr("stroke", function(d){ return  ctx.driver_colors[ctx.driver_translate[d.name]]})
      .style("stroke-width", 1)
      .style("fill", "none")
      .attr("opacity", function (d) { return ctx.driver_filter[d.name] === 0 ? 0 : 1; })
  
}

function createDRSChart(dataReady,x){
  var margin = {top: 10, right: 10, bottom: 10, left: 50},
  width = 700 - margin.left - margin.right,
  height = 100 - margin.top - margin.bottom;

  var DRSChart = d3.select("#drsChart")
      .append("svg")
      .attr("id","drs")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

  var allDRS = dataReady.flatMap(function(driverData) {
          return driverData.values.map(function(d) {
              return d.DRS;
          });
        });
      
  // Add Y axis
  var y = d3.scaleLinear()
    .domain( [Math.min(...allDRS),Math.max(...allDRS)])
    .range([ height, 0 ]);
  DRSChart.append("g")
    .call(d3.axisLeft(y).ticks(1));

    
  DRSChart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-family", "Arial")
    .style("font-size", "12px")
    .text("DRS");
  
  // Add the lines
  var line = d3.line()
  .x(function(d) { return x(d.Time) })
  .y(function(d) { return y(d.DRS) })

  DRSChart.selectAll("myLines")
    .data(dataReady)
    .enter()
    .append("path")
      .attr("d", function(d){ return line(d.values) } )
      .attr("id",d=>d.name)
      .attr("stroke", function(d){ return  ctx.driver_colors[ctx.driver_translate[d.name]]})
      .style("stroke-width", 1)
      .style("fill", "none")
      .attr("opacity", function (d) { return ctx.driver_filter[d.name] === 0 ? 0 : 1; })

}

function createRPMChart(dataReady,x){
  var margin = {top: 10, right: 10, bottom: 10, left: 50},
  width = 700 - margin.left - margin.right,
  height = 100 - margin.top - margin.bottom;

  var RPMChart = d3.select("#rpmChart")
      .append("svg")
      .attr("id","rpm")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

  var allRPM = dataReady.flatMap(function(driverData) {
          return driverData.values.map(function(d) {
              return d.RPM;
          });
        });
      
  // Add Y axis
  var y = d3.scaleLinear()
    .domain( [Math.min(...allRPM),Math.max(...allRPM)])
    .range([ height, 0 ]);
  RPMChart.append("g")
    .call(d3.axisLeft(y).ticks(2));

  RPMChart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-family", "Arial")
    .style("font-size", "12px")
    .text("RPM");
  
  // Add the lines
  var line = d3.line()
  .x(function(d) { return x(d.Time) })
  .y(function(d) { return y(d.RPM) })

  RPMChart.selectAll("myLines")
    .data(dataReady)
    .enter()
    .append("path")
      .attr("d", function(d){ return line(d.values) } )
      .attr("id",d=>d.name)
      .attr("stroke", function(d){ return  ctx.driver_colors[ctx.driver_translate[d.name]]})
      .style("stroke-width", 1)
      .style("fill", "none")
      .attr("opacity", function (d) { return ctx.driver_filter[d.name] === 0 ? 0 : 1; })
    
}

function createNGearChart(dataReady,x){
  var margin = {top: 10, right: 10, bottom: 30, left: 50},
  width = 700 - margin.left - margin.right,
  height = 140 - margin.top - margin.bottom;

  var NGearChart = d3.select("#ngearChart")
      .append("svg")
      .attr("id","ngear")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

  var allNGear = dataReady.flatMap(function(driverData) {
          return driverData.values.map(function(d) {
              return d.nGear;
          });
        });
      
  // Add Y axis
  var y = d3.scaleLinear()
    .domain( [Math.min(...allNGear),Math.max(...allNGear)])
    .range([ height, 0 ]);
  NGearChart.append("g")
    .call(d3.axisLeft(y).ticks(4));

  NGearChart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-family", "Arial")
    .style("font-size", "12px")
    .text("nGear");

  
  NGearChart.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%M:%S")).ticks(d3.timeSecond.every(10)));

  // Append X axis label
  NGearChart.append("text")             
    .attr("transform",
          "translate(" + (width/2) + " ," + 
                        (height + margin.top + 20) + ")")
    .style("text-anchor", "middle")
    .style("font-family", "Arial")
    .style("font-size", "12px")
    .text("Time (mm:ss)");

  
  // Add the lines
  var line = d3.line()
  .x(function(d) { return x(d.Time) })
  .y(function(d) { return y(d.nGear) })

  NGearChart.selectAll("myLines")
    .data(dataReady)
    .enter()
    .append("path")
      .attr("d", function(d){ return line(d.values) } )
      .attr("id",d=>d.name)
      .attr("stroke", function(d){ return  ctx.driver_colors[ctx.driver_translate[d.name]]})
      .style("stroke-width", 1)
      .style("fill", "none")
      .attr("opacity", function (d) { return ctx.driver_filter[d.name] === 0 ? 0 : 1; })

}

function createSpeedChart(dataReady,x){
  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 10, bottom: 10, left: 50},
  width = 700 - margin.left - margin.right,
  height = 200 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var speedChart = d3.select("#speedChart")
  .append("svg")
      .attr("id","speed")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
  .append("g")
      .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

  // Extract all time values from the dataset
  var allSpeed = dataReady.flatMap(function(driverData) {
    return driverData.values.map(function(d) {
        return d.Speed;
    });
    });

  // Add Y axis
  var y = d3.scaleLinear()
      .domain( [0,Math.max(...allSpeed)])
      .range([ height, 0 ]);

  speedChart.append("g")
      .call(d3.axisLeft(y).ticks(5));

  speedChart.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-size", "12px")
      .text("Speed (km/h)");

    // Add the lines
  var line = d3.line()
      .x(function(d) { return x(d.Time) })
      .y(function(d) { return y(d.Speed) })

  speedChart.selectAll("myLines")
      .data(dataReady)
      .enter()
      .append("path")
        .attr("d", function(d){ return line(d.values) } )
        .attr("id",d=>d.name)
        .attr("stroke", function(d){ return  ctx.driver_colors[ctx.driver_translate[d.name]]})
        .style("stroke-width", 1)
        .style("fill", "none")
        .attr("opacity", function (d) { return ctx.driver_filter[d.name] === 0 ? 0 : 1; })

}

function createThrottleChart(dataReady,x){
  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 10, bottom: 10, left: 50},
  width = 700 - margin.left - margin.right,
  height = 100 - margin.top - margin.bottom;

  var throttleChart = d3.select("#throttleChart")
            .append("svg")
            .attr("id","throttle")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

  // Extract all time values from the dataset
  var allThrottle = dataReady.flatMap(function(driverData) {
    return driverData.values.map(function(d) {
        return d.Throttle;
    });
    });

    var yThrottle = d3.scaleLinear()
      .domain( [Math.min(...allThrottle),Math.max(...allThrottle)])
      .range([ height, 0 ]);
    throttleChart.append("g")
      .call(d3.axisLeft(yThrottle).ticks(2));

    
    throttleChart.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-size", "12px")
      .text("Throttle (M%)");

    var lineT = d3.line()
      .x(function(d) { return x(d.Time) })
      .y(function(d) { return yThrottle(d.Throttle) })

    throttleChart.selectAll("myLines")
      .data(dataReady)
      .enter()
      .append("path")
        .attr("d", function(d){ return lineT(d.values) } )
        .attr("id",d=>d.name)
        .attr("stroke", function(d){ return  ctx.driver_colors[ctx.driver_translate[d.name]]})
        .style("stroke-width", 1)
        .style("fill", "none")
        .attr("opacity", function (d) { return ctx.driver_filter[d.name] === 0 ? 0 : 1; })

}

function createTelemetryChartsTooltip(){
  addToolTip("brake", 100, 700)
  addToolTip("drs", 100, 700)
  addToolTip("speed", 200, 700)
  addToolTip("rpm", 100, 700)
  addToolTip("ngear", 100, 700)
  addToolTip("throttle", 100, 700)
}

function addToolTip(chart, height, width){

  // Create a tooltip
  var tooltip = d3.select("#"+chart+" g").append("g")
  .attr("class", "tooltip")
  .style("opacity", 1);

  tooltip.append("line")
  .attr("class", "tooltip-line-telemetry")
  .style("stroke", "black")
  .style("stroke-width", 1)
  .style("pointer-events", "none");

  var chartElement = d3.select("#" + chart + "Chart").node();
  var rect = chartElement.getBoundingClientRect();

  d3.select("#"+chart+"Chart").append("div")
  .attr("class", "tooltip-text-telemetry")
  .style("pointer-events", "none")
  .style("background-color", "white")
  .style("border", "solid")
  .style("border-width", "2px")
  .style("border-radius", "5px")
  .style("padding", "5px")
  .style("position", "absolute")
  .style("opacity",ctx.showLegend === true ? 1 : 0)
  .style("top", rect.top+ window.scrollY+10+"px")

  
  // Add a transparent overlay for mouse events
  d3.select("#"+chart+" g").append("rect")
  .attr("width", width)
  .attr("height", height)
  .style("fill", "none")
  .style("pointer-events", "all")
  .on("mousemove", mousemoveTelemetry)
  .on("mouseover", function(d){if (ctx.planeUpdater == null){d3.selectAll(".tooltip-text-telemetry").style("opacity",1)}})
  
}

function mousemoveTelemetry(event) {
  // if no replay
  if (ctx.planeUpdater == null){
    
    var bisectTime = d3.bisector(function(d) { return d.Time; }).left;

    var mouseX = ctx.xTime.invert(d3.pointer(event)[0]);
    currentTime = Math.round(mouseX)

    function findElementWithMaxValuesLength(dataReady) {
      if (!dataReady || dataReady.length === 0) {
        return null; // Return null if the array is empty or undefined
      }
    
      let maxValuesLength = -1; 
      let elementWithMaxValuesLength = null;
    
      for (const element of dataReady) {
        if (element.values && element.values.length > maxValuesLength) {
          maxValuesLength = element.values.length;
          elementWithMaxValuesLength = element;
        }
      }
    
      return elementWithMaxValuesLength;
    }

    elementWithMaxValuesLength = findElementWithMaxValuesLength(ctx.dataReady)
    var index = bisectTime(elementWithMaxValuesLength.values, currentTime);
    currentData=ctx.dataReady.map(function(element){
      if (element.values[index]){
        return {name: element.name, data: element.values[index]}
      }
      else {
        return {name: element.name, data: []}
      }
    }) //[{name, data: {Time, Speed, Brake, RPM, DRS, nGear, Throttle, X, Y}}] 
    
    //move line 
    d3.selectAll(".tooltip-line-telemetry")
      .attr("x1", ctx.xTime(currentTime))
      .attr("x2", ctx.xTime(currentTime))
      .attr("y1", 0)
      .attr("y2", 700)

    //`Time: ${formatTime(currentTime)}<br> <br>`
    speedData = ""
    throttleData = ""
    drsData =""
    ngearData=""
    rpmData=""
    brakeData=""
    currentData.forEach(element=>{
        if (ctx.driver_filter[element.name]==1){

          const driverColor = ctx.driver_colors[ctx.driver_translate[element.name]] || "black";
          speedData += `<span style="color: ${driverColor};">${element.name}:${element.data.Speed || ' '} km/h </span><br> `
          throttleData += `<span style="color: ${driverColor};">${element.name}:${element.data.Throttle || ' '} % </span><br> `
          drsData += `<span style="color: ${driverColor};">${element.name}:${element.data.DRS|| ' ' } </span><br> `
          ngearData+= `<span style="color: ${driverColor};">${element.name}:${element.data.nGear|| ' '} </span><br> `
          rpmData+= `<span style="color: ${driverColor};">${element.name}:${element.data.RPM|| ' '} RPM </span><br> `
          brakeData+= `<span style="color: ${driverColor};">${element.name}:${element.data.Brake|| 0} </span><br> `
        }
    })

    //make text appear
    d3.selectAll(".tooltip-text-telemetry")
      .style("left", (event.x + 30) + "px")
      .style("opacity",ctx.showLegend === true ? 1 : 0)
      .style("display", "block")

    d3.select("#speedChart .tooltip-text-telemetry")
      .html(speedData)

    d3.select("#throttleChart .tooltip-text-telemetry")
      .html(throttleData)

    d3.select("#brakeChart .tooltip-text-telemetry")
      .html(brakeData)
    
    d3.select("#drsChart .tooltip-text-telemetry")
      .html(drsData)

    d3.select("#rpmChart .tooltip-text-telemetry")
      .html(rpmData)

    d3.select("#ngearChart .tooltip-text-telemetry")
      .html(ngearData)

    // make driver position appear on the circuit
    currentData.forEach(element=>{
      addDriverPositionOnMap([element.data], element.name,0)})
  }
}

function moveReplay(time){
  
  //move line 
  d3.selectAll(".tooltip-line-telemetry")
    .attr("x1", ctx.xTime(time))
    .attr("x2", ctx.xTime(time))
    .attr("y1", 0)
    .attr("y2", 700)

  currentData=ctx.dataReady.map(function(element){
      c = element.values.filter(d=>d.Time == time)
      if (c.length<1){
        return {name: element.name, data: []}
      }
      else {
        return {name: element.name, data: c[0]}
      }
  })

  speedData = ""
  throttleData = ""
  drsData =""
  ngearData=""
  rpmData=""
  brakeData=""
  currentData.forEach(element=>{
        if (ctx.driver_filter[element.name]==1){

          const driverColor = ctx.driver_colors[ctx.driver_translate[element.name]] || "black";
          speedData += `<span style="color: ${driverColor};">${element.name}:${element.data.Speed || ' '} km/h </span><br> `
          throttleData += `<span style="color: ${driverColor};">${element.name}:${element.data.Throttle || ' '} % </span><br> `
          drsData += `<span style="color: ${driverColor};">${element.name}:${element.data.DRS || ' '} </span><br> `
          ngearData+= `<span style="color: ${driverColor};">${element.name}:${element.data.nGear || ' ' } </span><br> `
          rpmData+= `<span style="color: ${driverColor};">${element.name}:${element.data.RPM || ' '} RPM </span><br> `
          brakeData+= `<span style="color: ${driverColor};">${element.name}:${element.data.Brake || 0} </span><br> `
        }
  })


  var chartElement = d3.select("#speedChart").node();
  var rect = chartElement.getBoundingClientRect();

  //make text appear
  d3.selectAll(".tooltip-text-telemetry")
      .style("left", (ctx.xTime(time)+rect.left+ window.scrollX+ + 70) + "px")
      .style("opacity",ctx.showLegend === true ? 1 : 0)
      .style("display", "block");

  d3.select("#speedChart .tooltip-text-telemetry")
      .html(speedData)

  d3.select("#throttleChart .tooltip-text-telemetry")
      .html(throttleData)

  d3.select("#brakeChart .tooltip-text-telemetry")
      .html(brakeData)
    
  d3.select("#drsChart .tooltip-text-telemetry")
      .html(drsData)

  d3.select("#rpmChart .tooltip-text-telemetry")
      .html(rpmData)

  d3.select("#ngearChart .tooltip-text-telemetry")
      .html(ngearData)

}

// called when a new lap is selected
function updateChart(telemetry) {

  // Load new Lap Data
  getLapData(telemetry)

  //reinit all the index for replay 
  ctx.index = new Array(20).fill(0)
  clearInterval(ctx.planeUpdater);
  ctx.planeUpdater = null
  button = document.getElementById("button");
  button.textContent = "Start Replay"

  //update speed chart too 
  d3.select("#speed").remove();
  d3.select("#brake").remove();
  d3.select("#throttle").remove();
  d3.select("#drs").remove();
  d3.select("#rpm").remove();
  d3.select("#ngear").remove();
  document.getElementById("telemetryChart").remove();
  createChart()
  createShowLegendCheckBox()
  
  d3.select("#lapSelectedDisplay svg text").text("Telemetry Charts For Lap: "+ ctx.lapSelected);
}

function createShowLegendCheckBox(){
  
  // Create the "Show Legend" checkbox
  let showLegendCheckbox = document.createElement("input");
  showLegendCheckbox.type = "checkbox";
  showLegendCheckbox.id = "showLegendCheckbox";
  showLegendCheckbox.style.marginLeft = "40px";
  showLegendCheckbox.checked = true;
  ctx.showLegend = true 

  let showLegendLabel = document.createElement("label");
  showLegendLabel.htmlFor = "showLegendCheckbox";
  showLegendLabel.textContent = "Show Legend";
  showLegendLabel.style.marginLeft = "5px";

  showLegendCheckbox.addEventListener("change", function() {
    if (ctx.showLegend == false){
      ctx.showLegend = true
    }
    else{
      ctx.showLegend = false
      d3.selectAll(".tooltip-text-telemetry").style("opacity",0)
    }
    console.log(ctx.showLegend)
  });

  container = document.createElement("showLegendCheckBox")
  container.id = "showLegendCheckBox"
  container.style.display = "flex"
  document.getElementById("telemetryChart").appendChild(container)
  container.appendChild(showLegendCheckbox);
  container.appendChild(showLegendLabel);
}

// UTILITY FUNCTION

function formatTime(milliseconds) {
  var date = new Date(milliseconds);

  var minutes = date.getUTCMinutes();
  var seconds = date.getUTCSeconds();
  var milliseconds = date.getUTCMilliseconds();

  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  milliseconds = milliseconds < 10 ? '00' + milliseconds : (milliseconds < 100 ? '0' + milliseconds : milliseconds);

  var formattedTime = minutes + ':' + seconds + '.' + milliseconds;

  return formattedTime;
}

function lapTimeToMilliseconds(lapTime) {

  // Split the lap time string into days, hours, minutes, seconds, and milliseconds
  result = lapTime.match(/(\d+) days (\d+):(\d+):(\d+)\.(\d+)/);
  if (result==null){
    return 10000000000
  }
  var [, days, hours, minutes, seconds, milliseconds] = result

  // Convert all parts to milliseconds
  return (
    parseInt(days) * 24 * 60 * 60 * 1000 +
    parseInt(hours) * 60 * 60 * 1000 +
    parseInt(minutes) * 60 * 1000 +
    parseInt(seconds) * 1000 +
    parseInt(milliseconds.slice(0,3))
  );
}


// REPLAY OPTION

function startPositionUpdater(data) {
    
    ctx.planeUpdater = setInterval(
        function () {
            //sent for each driver position
            data.forEach((d,i)=>{
                if (ctx.index[i] < d.length){
                    addDriverPositionOnMap([d[ctx.index[i]]], ctx.drivers[i],100)
                    ctx.index[i] = ctx.index[i]+1
                }
            })
            moveReplay(ctx.dataReady[1]['values'][ctx.index[1]].Time)
            
        },
        100);
};

