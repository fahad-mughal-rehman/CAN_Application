import React, { useContext, useState, useEffect } from "react";
import { MissionContext } from "../context/MissionContext";
import "../styles/Canbus.css";
import { Square } from "lucide-react";


const Canbus = () => {
  const [subunits, setSubunits] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6:0 });
  const [setMode, setSetMode] = useState("0x07");
  const [datawords, setDatawords] = useState(["", "", "", "", ""]);
  const [statusInterval, setStatusInterval] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [commandResponses, setCommandResponses] = useState([]);
  const [decodedStatus, setDecodedStatus] = useState(null);
  const { missionData, setMissionData } = useContext(MissionContext);


  const subunitConfig = [
    { id: 1, name: 'CAN Bus Power' },
    { id: 2, name: 'CAN1 Bus Open Channel' },
    { id: 3, name: 'CAN0 Bus Open Channel' },
    { id: 4, name: 'Main Relay' },
    { id: 5, name: 'TRM 13' },
    { id: 6, name: 'TRM 24' }
  ];

  const trmCommands = {
    startBeamDownload: "0x20",   // Replace with actual command
    stopBeamDownload: "0x21",    // Replace with actual command
    sendUpdatedPackets: "0x22",  // Replace with actual command
  };

  // Load mission data when missionData changes
  useEffect(() => {
    if (missionData) {
      setSetMode(missionData.canbus_SetMode || "0x07");
    }
  }, [missionData]);

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [statusInterval]);



    const TEMP = [
    -10	,-9	,-8	,-7	,-6	,-5	,-4	,-3	,-2	,-1	,0	,1	,
      2	,
      3	,
      4	,
      5	,
      6	,
      7	,
      8	,
      9	,
      10	,
      11	,
      12	,
      13	,
      14	,
      15	,
      16	,
      17	,
      18	,
      19	,
      20	,
      21	,
      22	,
      23	,
      24	,
      25	,
      26	,
      27	,
      28	,
      29	,
      30	,
      31	,
      32	,
      33	,
      34	,
      35	,
      36	,
      37	,
      38	,
      39	,
      40	,
      41	,
      42	,
      43	,
      44	,
      45	,
      46	,
      47	,
      48	,
      49	,
      50	,
      51	,
      52	,
      53	,
      54	,
      55	,
      56	,
      57	,
      58	,
      59	,
      60	,
      61	,
      62	,
      63	,
      64	,
      65	,
      66	,
      67	,
      68	,
      69	,
      70	,
      71	,
      72	,
      73	,
      74	,
      75	,
      76	,
      77	,
      78	,
      79	,
      80,
  ];

  const VOLT = [
    2061,
    2019	,
    1976	,
    1933	,
    1890	,
    1848	,
    1805	,
    1762	,
    1719	,
    1677	,
    1634	,
    1592	,
    1551	,
    1509	,
    1469	,
    1428	,
    1388	,
    1349	,
    1310	,
    1272	,
    1235	,
    1198	,
    1162	,
    1127	,
    1092	,
    1058	,
    1025	,
    993	,
    961	,
    931	,
    901	,
    872	,
    843	,
    816	,
    789	,
    763	,
    737	,
    713	,
    689	,
    666	,
    643	,
    622	,
    601	,
    580	,
    561	,
    542	,
    523	,
    505	,
    488	,
    472	,
    456	,
    440	,
    425	,
    410	,
    397	,
    383	,
    370	,
    358	,
    346	,
    334	,
    323	,
    312	,
    301	,
    291	,
    281	,
    272	,
    263	,
    254	,
    246	,
    238	,
    230	,
    222	,
    215	,
    208	,
    201	,
    195	,
    188	,
    182	,
    176	,
    171	,
    165	,
    160	,
    155	,
    150	,
    145	,
    141	,
    136	,
    132	,
    128	,
    124	,
    120,
  ];

  function convertTemp(READ_VOLT) {
    for(let i = 0; i < VOLT.length; i++) {
      if(READ_VOLT >= VOLT[i]) {
        return TEMP[i];
      }
    }
    return 23; // default temperature if no match
  }

  const convertRawTempToCelsius = (rawValue) => {
    // Example scaling function: 
    // Convert raw sensor value to Celsius with formula you can modify
    // For example, convert raw ADC value to voltage then to Celsius
    // This is a placeholder; replace with your actual formula
    const voltage = (rawValue * 3.3) / 265595; // assuming 12-bit ADC and 3.3V ref
    const celsius = voltage;  // example sensor scaling
    return celsius;
  };


   const getStatusCoreText = (code) => {
    switch (code) {
      case 0x00:
        return "OFF";
      case 0x01:
        return "Core Ready";
      case 0x02:
        return "Operation in Progress";
      case 0x03:
        return "Operation Halted";
      case 0x04:
        return "Operation Failed";
      default:
        return `Unknown (${code})`;
    }
  };

  // 🔴🟢⚫

  useEffect(() => {
    if (missionData) {
      setSetMode(missionData.canbus_SetMode || "0x07");
    }
  }, [missionData]);

  useEffect(() => {
    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [statusInterval]);

  const decodeLittleEndian = (lsb, msb) => msb*256 + lsb;

  const parseStatusResponse = (response) => {
    const matched = response.match(/NO:(\w+)\s+LEN:\d+\s+DATA:([\da-fA-F\s]+)/);
    if (!matched) return null;

    const no = matched[1];
    const dataBytesHex = matched[2].trim().split(" ");
    const dataBytes = dataBytesHex.map((b) => parseInt(b, 16));

    switch (no.toUpperCase()) {
      case "21": {
        // VTM13, VTM24, VTM48, Current each 2 bytes LSB+MSB
        return {
          vtm13: decodeLittleEndian(dataBytes[2], dataBytes[3]),
          vtm24: decodeLittleEndian(dataBytes[0], dataBytes[1]),
          vtm48: decodeLittleEndian(dataBytes[4], dataBytes[5]),
          current1: decodeLittleEndian(dataBytes[6], dataBytes[7]),
        };
      }
      case "20": {
        // TH1-TH4 temperatures each 2 bytes LSB+MSB
        return {
          th1: decodeLittleEndian(dataBytes[0], dataBytes[1]),
          th2: decodeLittleEndian(dataBytes[2], dataBytes[3]),
          th3: decodeLittleEndian(dataBytes[4], dataBytes[5]),
          th4: decodeLittleEndian(dataBytes[6], dataBytes[7]),
        };
      }
      case "1E": {
        // Status Core Logic (2 bytes), Temperature (2 bytes)
        return {
          statusCoreCode: decodeLittleEndian(dataBytes[0], dataBytes[1]),
          temperature: decodeLittleEndian(dataBytes[2], dataBytes[3]),
        };
      }
      default:
        return null;
    }
  };
  

  const updateMissionData = (updatedData) => {
    setMissionData((prev) => ({
      ...prev,
      canbus_Subunits: JSON.stringify(updatedData.subunits),
      canbus_SetMode: updatedData.setMode,
      canbus_Datawords: JSON.stringify(updatedData.datawords),
      canbus_Status: "Active",
    }));
  };

  const handleDataWordChange = (index, value) => {
    const updatedDatawords = [...datawords];
    updatedDatawords[index] = value;
    setDatawords(updatedDatawords);
    updateMissionData({ subunits, setMode, datawords: updatedDatawords });
  };

  const sendCommand = async (hexCommand, value = null) => {
    try {
      const payload = { command: hexCommand };
      if (value !== null) {
        payload.value = value; // Include dataword value
      }

      const res = await fetch("http://localhost:5000/api/send-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // Update command responses list
      setCommandResponses((prev) => [
        ...prev,
        {
          command: hexCommand,
          response: data.response || data.message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // If this is a status command, parse and update status separately
      if (hexCommand === "0x08" && data.response) {
        updateStatusFromResponse(data.response);
      }

      // Also update status if response string contains NO identifiers
      if (data.response) {
        const partialStatus = parseStatusResponse(data.response);
        if (partialStatus) {
          setDecodedStatus((prev) => ({ ...prev, ...partialStatus }));

          // For statusCoreCode, also decode and set statusCore text
          if (partialStatus.statusCoreCode !== undefined) {
            setDecodedStatus((prev) => ({
              ...prev,
              statusCore: getStatusCoreText(partialStatus.statusCoreCode),
            }));
          }
        }
      }
    } catch (err) {
      console.error("Command error:", err);
    }
  };


  // Helper for updating status from a response string
  const updateStatusFromResponse = (res) => {
    const newStatusPart = parseStatusResponse(res);

    if (newStatusPart) {
      setDecodedStatus((prev) => ({
        ...prev,
        ...newStatusPart,
      }));

      // If statusCoreCode updated, decode to text
      if (newStatusPart.statusCoreCode !== undefined) {
        setDecodedStatus((prev) => ({
          ...prev,
          statusCore: getStatusCoreText(newStatusPart.statusCoreCode),
        }));
      }
    }
  };
  
  const sendStatusCommand = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/send-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: "0x08" }),
      });

      const data = await res.json();
      setStatusMessage(data.response || data.message);

      if (data.response) {
        updateStatusFromResponse(data.response);
      }

      setCommandResponses((prev) => [
        ...prev,
        {
          command: "0x08",
          response: data.response || data.message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err) {
      console.error("Error sending status command:", err);
      setStatusMessage(`Error: ${err.message}`);
    }
  };


  const handleSubunitChange = async (num) => {
    const updatedSubunits = { ...subunits, [num]: subunits[num] === 1 ? 0 : 1 };
    setSubunits(updatedSubunits);
    updateMissionData({ subunits: updatedSubunits, setMode, datawords });
    const turningOn = updatedSubunits[num] === 1;
  

  

    try {
      if (turningOn) {
        switch (num) {
          case 1: await sendCommand("0x1A"); break;
          case 2: await sendCommand("0x1B"); break;
          case 3: await sendCommand("0x1F"); break;
          case 4: await sendCommand("0x1C"); break;
          case 5: await sendCommand("0x1D"); break; // Example command
          case 6: await sendCommand("0x1E"); break; // Example command
        
          
          default: break;
        }

        if (updatedSubunits[1] === 1) {
          if (!statusInterval) {
            const interval = setInterval(sendStatusCommand, 100);
            setStatusInterval(interval);
            await sendStatusCommand();
          }
        }
      } else {
        switch (num) {
          case 1: await sendCommand("0x0A"); break;  
          case 2: await sendCommand("0x0B"); break;
          case 3: await sendCommand("0x0F"); break;
          case 4: await sendCommand("0x0C"); break;
          case 5: await sendCommand("0x0D"); break; // Example OFF command
          case 6: await sendCommand("0x0E"); break; // Example OFF command
          
          default: break;
        }
        if (num === 1) {
          if (statusInterval) {
            clearInterval(statusInterval);
            setStatusInterval(null);
          }
          setStatusMessage("CAN Power turned OFF");
        }
      }
    } catch (err) {
      console.error("Error toggling subunit:", err);
    }
  };

  const [selectedMode, setSelectedMode] = useState(""); // default mode 1
const [beamValue, setBeamValue] = useState("");        // empty beam input
const [tableValue, setTableValue] = useState("0");        // empty beam input
const [repeatValue, setRepeatValue] = useState("0");        // empty beam input

const modeMap = {
  "1": "A",
  "2": "B",
  "3": "C",
};

const tableMap = {
  "1": "C1",
  "2": "C2",
  "3": "C3",
  "4": "C4",
  "5": "C5",
  "6": "C6",
  "7": "C7",
  "8": "C8",
  "9": "C9",
  "10": "C10",
  "11": "C11",
  "12": "C12",
  "13": "C13",
  "14": "C14",
  "9": "C9",
  "10": "C10",
  "19": "C19",
  "20": "C20",
  "30": "C30",
  "32": "C32",
  "40": "C40",
  "50": "C50",
  "51": "C51",
  "60": "C60",
  "61": "C61",
  "65": "C65",
  "70": "C70",
};

const handleSaveModeBeam = async () => {
  try {
    // Map selected mode to letter
    const modeLetter = modeMap[selectedMode] || "A"; // default to A if not found
    const tableLetter = tableMap[tableValue] || "C1"; // default to A if not found

    // Combine mode letter + beam value
    const combinedCommand = `${modeLetter}${beamValue}`;

    // Send combined command
    //await sendCommand(combinedCommand);
    sendCommand(`P${selectedMode}`); // Reset command
    sendCommand(`B${beamValue}`); // Reset command
    sendCommand(`${tableLetter}`); // Reset command
    sendCommand(`R${repeatValue}`); // Reset command
    console.log("Sent combined command:", combinedCommand);
    
    // Optionally, send to backend API to save
    const payload = { mode: selectedMode, beam: beamValue };
    const res = await fetch("http://localhost:5000/api/save-mode-beam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Save Mode & Beam response:", data);

  } catch (error) {
    console.error("Error saving mode and beam:", error);
  }
};

  return (
    <div>
      <div className="canbus-configurations">
        <div className="canbus-configurations-header">CANBUS Switching</div>
        <div className="canbus-configurations-content"> 

          {/* Sub-units */}
          {subunitConfig.map(({ id, name }) => (
              <div key={id} className="canbus-configurations-subunit">
                <div className="canbus-configurations-subunit-content">
                  <span>{name}</span>
                  <span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={subunits[id] === 1}
                        onChange={() => handleSubunitChange(id)}
                      />
                      <span className="slider round"></span>
                    </label>
                  </span>
                </div>
              </div>
            ))}
            
          <div className="canbus-buttons-data-table">
          <div>TRM Configuration</div>
          
          <div className="uart-configurations-mode-content">
              <span>Select TRM Configuration</span>
              <span>
                <select value={tableValue} onChange={(e) => {
                                        const selectedValue = e.target.value;
                                        setTableValue(selectedValue);
                                        if (selectedValue !== "0") {
                                          setBeamValue(selectedValue); // automatically fill beam text box
                                        }
                                      }}>
                  <option value="0" disabled>Choose Configuration</option>
                  <option value="1">TRM-CONFIG-1</option>
                  <option value="2">TRM-CONFIG-2</option>
                  <option value="3">TRM-CONFIG-3</option>
                  <option value="4">TRM-CONFIG-4</option>
                  <option value="5">TRM-CONFIG-5</option>
                  <option value="6">TRM-CONFIG-6</option>
                  <option value="9">TRM-CONFIG-9</option>
                  <option value="10">TRM-CONFIG-10</option>
                  <option value="19">TRM-CONFIG-19</option>
                  <option value="20">TRM-CONFIG-20</option>
                  <option value="30">TRM-CONFIG-30</option>
                  <option value="32">TRM-CONFIG-32</option>
                  <option value="40">TRM-CONFIG-40</option>
                  <option value="50">TRM-CONFIG-50</option>
                  <option value="51">TRM-CONFIG-51</option>
                  <option value="60">TRM-CONFIG-60</option>
                  <option value="61">TRM-CONFIG-61</option>
                  <option value="65">TRM-CONFIG-65</option>
                  <option value="70">TRM-CONFIG-70</option>
                </select>
              </span>
            </div>
            <div className="canbus-save-mode-beam" style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
            
            <label htmlFor="modeSelector" style={{ marginRight: "0.5rem" }}>
              Pulse Count:
            </label>
            <input
              id="text"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              style={{ marginRight: "0.01rem", width: "80px" }}
              placeholder="Enter Pulse"
            />
            <label htmlFor="beamInput" style={{ marginLeft: "0.3rem", marginRight: "0.02rem" }}>
             Beam:
            </label>
            <input
              id="beamInput"
              type="text"
              value={beamValue}
              onChange={(e) => setBeamValue(e.target.value)}
              style={{ marginLeft: "0.5rem", width: "100px" }}
              placeholder="Enter beam"
            />
            <div className="uart-configurations-mode-content">
              <span>Select TRM Repetition</span>
              <span>
                <select value={repeatValue} onChange={(e) => {
                                        const selectedValue = e.target.value;
                                        setRepeatValue(selectedValue);
                                      }}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </span>
            </div>

          </div>
          <button
              className="reset-button"  // <- change class here
              style={{ marginTop: "0.0rem" }}
              onClick={handleSaveModeBeam}
            >
              Save Conguration
            </button>

          
          <button
            className="reset-button"
            
            onClick={() => {
              sendCommand("0x90"); // Reset command
            }}
          >
            Send Configuration
            </button>
   
          </div>

          <div className="canbus-operation-container">
            <div>Canbus Operation</div>
            
            <button
            className="reset-button"
            
            onClick={() => {
              sendCommand("0x91"); // Reset command
            }}
          >
            Start Beam Forming
          </button>

          
          <button
            className="reset-button"
            
            onClick={() => {
              sendCommand("0x92"); // Reset command
            }}
          >
            Stop Beam Forming
          </button>

          <button
            className="reset-button"

            onClick={() => {
              sendCommand("0x93"); // Reset command
            }}
          >
            Reset PCE
          </button>

          <button
            className="reset-button"
            
            onClick={() => {
              sendCommand("0x95"); // Reset command
            }}
          >
            Reset CAN MODULE
          </button>
          </div>

          {/* Reset Button */}
          
          {/* <button>Config Data Values Set-1 7-Bytes</button>
          <button>Config Data Values Set-2 4-Bytes</button>
          <button>Config Data Values Set-3 2-Bytes</button> */}
                    {/* CANBUS STATUS */}

          {/* Other UI elements for TRM Configuration, Save, Buttons */}
          {/* ... (your existing UI code for these sections) */}

          <div className="canbus-status-read">
            <h4>Current Status</h4>
            <div className="status-message-grid">
              {subunits[1] === 1 ? (
                <>
                  <div>Status Core</div>
                  <div>{decodedStatus?.statusCore || "N/A"}</div>
                  <div></div>

                  <div>Temperature</div>
                  <div>{(convertRawTempToCelsius(decodedStatus?.temperature)).toFixed(2) || "N/A"}°C</div>
                  <div>
                    {(convertRawTempToCelsius(decodedStatus?.temperature)) > 60 ? (
                      <Square color="red" fill="red" />
                    ) : (convertRawTempToCelsius(decodedStatus?.temperature)) > 0 ? (
                      <Square color="green" fill="green" />
                    ) : (
                      <Square color="black" fill="black" />
                    )}
                  </div>

                  <div>VTM 13</div>
                  <div>{(decodedStatus?.vtm13*71.68/4096).toFixed(2) ?? "N/A"} V</div>
                  <div>
                    {decodedStatus?.vtm13 === 0 ? (
                      <Square color="black" fill="black" />
                    ) : decodedStatus?.vtm13*71.68/4096 > 0 && decodedStatus?.vtm13*71.68/4096 <= 31 ? (
                      <Square color="green" fill="green" />
                    ) : decodedStatus?.vtm13 ? (
                      <Square color="red" fill="red" />
                    ) : (
                      <Square color="gray" fill="gray" />
                    )}
                  </div>

                  <div>VTM 24</div>
                  <div>{(decodedStatus?.vtm24*71.68/4096).toFixed(2) ?? "N/A"}</div>
                  <div>
                    {decodedStatus?.vtm24 === 0 ? (
                      <Square color="black" fill="black" />
                    ) : decodedStatus?.vtm24*71.68/4096 > 0 && decodedStatus?.vtm24*71.68/4096 <= 31 ? (
                      <Square color="green" fill="green" />
                    ) : decodedStatus?.vtm24 ? (
                      <Square color="black" fill="black" />
                    ) : (
                      <Square color="gray" fill="gray" />
                    )}
                  </div>

                  <div>VTM 48</div>
                  <div>{(decodedStatus?.vtm48*115.6517134096/4096).toFixed(2) ?? "N/A"} V</div>
                  <div>
                    {decodedStatus?.vtm48 === 0 ? (
                      <Square color="black" fill="black" />
                    ) : decodedStatus?.vtm48*115.6517134096/4096 > 0 && decodedStatus?.vtm48*115.6517134096/4096 <= 50 ? (
                      <Square color="green" fill="green" />
                    ) : decodedStatus?.vtm48*115.6517134096/4096 > 51 ? (
                      <Square color="black" fill="red" />
                    ) : (
                      <Square color="gray" fill="gray" />
                    )}
                  </div>

                  <div>Current</div>
                  <div>{(decodedStatus?.current1*23.0865/4096).toFixed(2) ?? "N/A"}</div>
                  <div>
                    {decodedStatus?.current1 === 0 ? (
                      <Square color="red" fill="red" />
                    ) : decodedStatus?.current1 >= 0 && decodedStatus?.current1 <= 255 ? (
                        <Square color="green" fill="green" />
                    ) : (
                      <Square color="gray" fill="gray" />
                    )}
                  </div>
                  
                  <div>Temperature TH1</div>
                  <div>{decodedStatus?.th1 !== undefined ? (convertTemp(decodedStatus.th1))-5 : "N/A"} °C</div>
                  <div></div>

                  <div>Temperature TH2</div>
                  <div>{decodedStatus?.th2 !== undefined ? (convertTemp(decodedStatus.th2))-5 : "N/A"} °C</div>
                  <div></div>

                  <div>Temperature TH3</div>
                  <div>{decodedStatus?.th3 !== undefined ? (convertTemp(decodedStatus.th3))-5: "N/A"} °C</div>
                  <div></div>

                  <div>Temperature TH4</div>
                  <div>{decodedStatus?.th4 !== undefined ? (convertTemp(decodedStatus.th4))-5 : "N/A"} °C</div>
                  <div></div>
                </>
              ) : (
                <div style={{ gridColumn: "span 3" }}>CAN Power is OFF</div>
              )}
            </div>
          </div>

          {/* Command Responses Section */}
          <div className="canbus-responses-container">
            <h3>Command History</h3>
            <div className="canbus-responses-list">
              {commandResponses.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commandResponses
                      .slice()
                      .reverse()
                      .map((item, index) => (
                        <tr key={index}>
                          <td>{item.timestamp}</td>
                          <td>{item.response}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p>No commands sent yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Canbus;