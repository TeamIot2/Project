<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Register Gateway">
  <Uu5Bricks.Section header="Trigger List">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"System Administrator\",\"The administrator needs to activate a gateway so that devices can send data to the cloud application.\"]]" columns="<uu5json/>[{\"header\":\"Triggered by\"},{\"header\":\"Trigger Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Pre-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The administrator is authenticated. The gateway software is running and network connectivity to the cloud is available.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Post-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>A gateway record exists in the cloud application, the gateway is authorized to send data, and the system can associate incoming readings with the correct installation.</p>"/>
  </Uu5Bricks.Section>
  <UuApp.DesignKit.BusinessScenario data="<uu5json/>{\"version\":\"1.0.0\",\"id\":\"buc-register-gateway\",\"name\":\"Business Use Case Specification\",\"description\":\"\",\"generateErrorList\":false,\"statementList\":[{\"name\":\"The administrator opens the gateway registration or setup flow.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-register-gateway-step-1\",\"type\":\"step\",\"label\":\"1.\",\"statementList\":[]},{\"name\":\"The administrator enters or confirms gateway identification data.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-register-gateway-step-2\",\"type\":\"step\",\"label\":\"2.\",\"statementList\":[]},{\"name\":\"The system validates the registration request.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-register-gateway-step-3\",\"type\":\"step\",\"label\":\"3.\",\"statementList\":[]},{\"name\":\"The system creates or activates the gateway record.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-register-gateway-step-4\",\"type\":\"step\",\"label\":\"4.\",\"statementList\":[]},{\"name\":\"The gateway receives confirmation that it can communicate with the cloud.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-register-gateway-step-5\",\"type\":\"step\",\"label\":\"5.\",\"statementList\":[]}]}"/>
  <Uu5Bricks.Section contentEditable header="Mockups and Wireframes" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Simple setup form with gateway name, registration state, connection status, and confirmation message after successful activation.</p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Gateway name\",\"gateway.name\",\"Text input\",\"Display name of the gateway installation.\"],[\"Registration status\",\"gateway.registrationStatus\",\"Status badge\",\"Shows whether the gateway is already activated in the cloud application.\"],[\"Connection status\",\"gateway.connectivityStatus\",\"Status badge\",\"Shows whether the gateway can currently reach the cloud application.\"],[\"Activate gateway\",\"-\",\"Primary button\",\"Confirms the registration flow and creates or activates the gateway record.\"]]" columns="<uu5json/>[{\"header\":\"Name\",\"highlighted\":true,\"style\":{\"italic\":true}},{\"header\":\"Data binding\",\"style\":{\"italic\":true}},{\"header\":\"Component\",\"style\":{\"italic\":true}},{\"header\":\"Description\",\"style\":{\"italic\":true}}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Connect New Monitoring Device">
  <Uu5Bricks.Section header="Trigger List">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Maintenance Technician\",\"A new device is physically installed and must be made available in the monitoring application.\"],[\"System Administrator\",\"The administrator wants to add a new device record and assign it to an environment.\"]]" columns="<uu5json/>[{\"header\":\"Triggered by\"},{\"header\":\"Trigger Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Pre-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The gateway is registered and operational. The new monitoring device is powered and physically connected or otherwise reachable.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Post-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The monitoring device is visible in the application, linked to the selected environment, and ready to send readings.</p>"/>
  </Uu5Bricks.Section>
  <UuApp.DesignKit.BusinessScenario data="<uu5json/>{\"version\":\"1.0.0\",\"id\":\"buc-connect-new-monitoring-device\",\"name\":\"Business Use Case Specification\",\"description\":\"\",\"generateErrorList\":false,\"statementList\":[{\"name\":\"The technician or administrator opens the device management page.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-connect-device-step-1\",\"type\":\"step\",\"label\":\"1.\",\"statementList\":[]},{\"name\":\"The user selects the option to connect a new device.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-connect-device-step-2\",\"type\":\"step\",\"label\":\"2.\",\"statementList\":[]},{\"name\":\"The system detects or accepts identification of the device.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-connect-device-step-3\",\"type\":\"step\",\"label\":\"3.\",\"statementList\":[]},{\"name\":\"The user assigns a display name and environment.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-connect-device-step-4\",\"type\":\"step\",\"label\":\"4.\",\"statementList\":[]},{\"name\":\"The system stores the device record and marks it as available for monitoring.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-connect-device-step-5\",\"type\":\"step\",\"label\":\"5.\",\"statementList\":[]}]}"/>
  <Uu5Bricks.Section contentEditable header="Mockups and Wireframes" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Device list with a modal dialog for connecting a new device, entering basic metadata, and confirming successful connection.</p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Device name\",\"monitoringDevice.name\",\"Text input\",\"User-defined display name of the device.\"],[\"Environment\",\"monitoringDevice.assignedEnvironmentId\",\"Select box\",\"Allows assignment of the device to a monitored environment.\"],[\"Connection status\",\"monitoringDevice.connectionStatus\",\"Status badge\",\"Shows whether the device is detected and available.\"],[\"Connect device\",\"-\",\"Primary button\",\"Creates the device record and confirms the connection flow.\"]]" columns="<uu5json/>[{\"header\":\"Name\",\"highlighted\":true,\"style\":{\"italic\":true}},{\"header\":\"Data binding\",\"style\":{\"italic\":true}},{\"header\":\"Component\",\"style\":{\"italic\":true}},{\"header\":\"Description\",\"style\":{\"italic\":true}}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Start Monitoring">
  <Uu5Bricks.Section header="Trigger List">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Monitoring Operator\",\"The operator wants the system to start or continue collecting live environmental data from an available device.\"]]" columns="<uu5json/>[{\"header\":\"Triggered by\"},{\"header\":\"Trigger Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Pre-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>At least one monitoring device is connected, the gateway is active, and the device has an assigned environment and optionally an evaluation mode.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Post-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The device actively delivers readings through the gateway and the latest values become available in the cloud application and dashboard.</p>"/>
  </Uu5Bricks.Section>
  <UuApp.DesignKit.BusinessScenario data="<uu5json/>{\"version\":\"1.0.0\",\"id\":\"buc-start-monitoring\",\"name\":\"Business Use Case Specification\",\"description\":\"\",\"generateErrorList\":false,\"statementList\":[{\"name\":\"The operator opens the monitoring dashboard.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-start-monitoring-step-1\",\"type\":\"step\",\"label\":\"1.\",\"statementList\":[]},{\"name\":\"The operator selects a device or environment.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-start-monitoring-step-2\",\"type\":\"step\",\"label\":\"2.\",\"statementList\":[]},{\"name\":\"The operator starts monitoring if it is not already active.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-start-monitoring-step-3\",\"type\":\"step\",\"label\":\"3.\",\"statementList\":[]},{\"name\":\"The monitoring device sends readings to the gateway.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-start-monitoring-step-4\",\"type\":\"step\",\"label\":\"4.\",\"statementList\":[]},{\"name\":\"The gateway forwards the readings to the cloud.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-start-monitoring-step-5\",\"type\":\"step\",\"label\":\"5.\",\"statementList\":[]},{\"name\":\"The dashboard refreshes and shows the current values.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-start-monitoring-step-6\",\"type\":\"step\",\"label\":\"6.\",\"statementList\":[]}]}"/>
  <Uu5Bricks.Section contentEditable header="Mockups and Wireframes" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Dashboard screen with start or stop monitoring controls, current sensor cards or gauges, and device state indicators.</p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Environment selector\",\"environment.environmentId\",\"Carousel or selector\",\"Allows the user to choose the environment or device context for monitoring.\"],[\"Start monitoring\",\"-\",\"Primary button\",\"Starts or resumes active monitoring for the selected device or environment.\"],[\"Current values\",\"environmentalReading.*\",\"Sensor cards or gauges\",\"Displays the latest measured values for the active monitoring context.\"],[\"Device state\",\"monitoringDevice.connectionStatus\",\"Status badge\",\"Shows whether the selected device is currently available and transmitting.\"]]" columns="<uu5json/>[{\"header\":\"Name\",\"highlighted\":true,\"style\":{\"italic\":true}},{\"header\":\"Data binding\",\"style\":{\"italic\":true}},{\"header\":\"Component\",\"style\":{\"italic\":true}},{\"header\":\"Description\",\"style\":{\"italic\":true}}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Review Current Environmental State">
  <Uu5Bricks.Section header="Trigger List">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Monitoring Operator\",\"The operator wants to inspect the latest environmental values and identify whether any measured value is abnormal.\"],[\"Facility Manager\",\"The stakeholder wants a quick overview of the current state of a monitored environment.\"]]" columns="<uu5json/>[{\"header\":\"Triggered by\"},{\"header\":\"Trigger Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Pre-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Recent readings are available in the system and the user is authenticated.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Post-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The user sees the latest values, understands the current state of the environment, and can decide whether further action is necessary.</p>"/>
  </Uu5Bricks.Section>
  <UuApp.DesignKit.BusinessScenario data="<uu5json/>{\"version\":\"1.0.0\",\"id\":\"buc-review-current-environmental-state\",\"name\":\"Business Use Case Specification\",\"description\":\"\",\"generateErrorList\":false,\"statementList\":[{\"name\":\"The user opens the dashboard.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-review-current-state-step-1\",\"type\":\"step\",\"label\":\"1.\",\"statementList\":[]},{\"name\":\"The system loads the latest readings for the selected environment or device.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-review-current-state-step-2\",\"type\":\"step\",\"label\":\"2.\",\"statementList\":[]},{\"name\":\"The system displays current values and their visual status.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-review-current-state-step-3\",\"type\":\"step\",\"label\":\"3.\",\"statementList\":[]},{\"name\":\"The user reviews the presented values.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-review-current-state-step-4\",\"type\":\"step\",\"label\":\"4.\",\"statementList\":[]},{\"name\":\"If needed, the user continues to a detailed history or alert-related action.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-review-current-state-step-5\",\"type\":\"step\",\"label\":\"5.\",\"statementList\":[]}]}"/>
  <Uu5Bricks.Section contentEditable header="Mockups and Wireframes" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Main dashboard with current-value widgets, environment carousel, status coloring, and quick navigation to device details.</p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Current temperature\",\"environmentalReading.temperature\",\"Value card\",\"Displays the latest measured temperature for the selected context.\"],[\"Current CO2\",\"environmentalReading.co2\",\"Value card\",\"Displays the latest carbon dioxide value and its evaluation state.\"],[\"Environment carousel\",\"environment.environmentId\",\"Carousel\",\"Allows switching between monitored environments.\"],[\"Status highlight\",\"alertEvent.status\",\"Color coding or badge\",\"Highlights dangerous or warning states directly in the dashboard.\"]]" columns="<uu5json/>[{\"header\":\"Name\",\"highlighted\":true,\"style\":{\"italic\":true}},{\"header\":\"Data binding\",\"style\":{\"italic\":true}},{\"header\":\"Component\",\"style\":{\"italic\":true}},{\"header\":\"Description\",\"style\":{\"italic\":true}}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Review Measurement History">
  <Uu5Bricks.Section header="Trigger List">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Monitoring Operator\",\"The operator wants to analyze changes over time and compare measured values.\"],[\"Facility Manager\",\"The stakeholder wants to evaluate long-term environmental trends.\"]]" columns="<uu5json/>[{\"header\":\"Triggered by\"},{\"header\":\"Trigger Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Pre-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Historical readings are stored in the cloud application and the user is authenticated.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Post-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The user obtains time-based insight into environmental behavior and can identify recurring problems, trends, or deviations.</p>"/>
  </Uu5Bricks.Section>
  <UuApp.DesignKit.BusinessScenario data="<uu5json/>{\"version\":\"1.0.0\",\"id\":\"buc-review-measurement-history\",\"name\":\"Business Use Case Specification\",\"description\":\"\",\"generateErrorList\":false,\"statementList\":[{\"name\":\"The user opens the history page.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-history-step-1\",\"type\":\"step\",\"label\":\"1.\",\"statementList\":[]},{\"name\":\"The user chooses a time range.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-history-step-2\",\"type\":\"step\",\"label\":\"2.\",\"statementList\":[]},{\"name\":\"The user filters by device, environment, or sensor type.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-history-step-3\",\"type\":\"step\",\"label\":\"3.\",\"statementList\":[]},{\"name\":\"The system loads matching historical readings.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-history-step-4\",\"type\":\"step\",\"label\":\"4.\",\"statementList\":[]},{\"name\":\"The system renders time-series charts in the selected chart mode.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-history-step-5\",\"type\":\"step\",\"label\":\"5.\",\"statementList\":[]},{\"name\":\"The user interprets the results and optionally adjusts filters.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-history-step-6\",\"type\":\"step\",\"label\":\"6.\",\"statementList\":[]}]}"/>
  <Uu5Bricks.Section contentEditable header="Mockups and Wireframes" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>History page with chart area, preset and custom time range controls, and selector panel for device and sensor filtering.</p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Time range\",\"historyFilter.timeRange\",\"Date range selector\",\"Allows the user to define the period for which historical data should be displayed.\"],[\"Device filter\",\"historyFilter.deviceId\",\"Select box\",\"Restricts the chart to a selected monitoring device.\"],[\"Sensor filter\",\"historyFilter.sensorType\",\"Select box\",\"Restricts the chart to a selected measurement category.\"],[\"History chart\",\"environmentalReading.*\",\"Time-series chart\",\"Visualizes the selected historical readings in the chosen chart mode.\"]]" columns="<uu5json/>[{\"header\":\"Name\",\"highlighted\":true,\"style\":{\"italic\":true}},{\"header\":\"Data binding\",\"style\":{\"italic\":true}},{\"header\":\"Component\",\"style\":{\"italic\":true}},{\"header\":\"Description\",\"style\":{\"italic\":true}}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Configure Monitoring Mode">
  <Uu5Bricks.Section header="Trigger List">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"System Administrator\",\"The administrator wants to define acceptable ranges for selected sensors.\"],[\"Monitoring Operator\",\"The operator needs to adjust evaluation thresholds for a practical monitoring scenario.\"]]" columns="<uu5json/>[{\"header\":\"Triggered by\"},{\"header\":\"Trigger Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Pre-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The user is authenticated and has permission to change configuration settings.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Post-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>A monitoring mode exists or is updated, and devices can be evaluated according to the configured thresholds.</p>"/>
  </Uu5Bricks.Section>
  <UuApp.DesignKit.BusinessScenario data="<uu5json/>{\"version\":\"1.0.0\",\"id\":\"buc-configure-monitoring-mode\",\"name\":\"Business Use Case Specification\",\"description\":\"\",\"generateErrorList\":false,\"statementList\":[{\"name\":\"The user opens the settings page.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-configure-mode-step-1\",\"type\":\"step\",\"label\":\"1.\",\"statementList\":[]},{\"name\":\"The user selects an existing mode or creates a new mode.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-configure-mode-step-2\",\"type\":\"step\",\"label\":\"2.\",\"statementList\":[]},{\"name\":\"The user edits threshold values for relevant sensors.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-configure-mode-step-3\",\"type\":\"step\",\"label\":\"3.\",\"statementList\":[]},{\"name\":\"The system validates the configuration.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-configure-mode-step-4\",\"type\":\"step\",\"label\":\"4.\",\"statementList\":[]},{\"name\":\"The system stores the monitoring mode.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-configure-mode-step-5\",\"type\":\"step\",\"label\":\"5.\",\"statementList\":[]},{\"name\":\"The updated mode becomes available for device assignment and alert evaluation.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-configure-mode-step-6\",\"type\":\"step\",\"label\":\"6.\",\"statementList\":[]}]}"/>
  <Uu5Bricks.Section contentEditable header="Mockups and Wireframes" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Settings screen with expandable mode cards, threshold fields for sensor categories, and actions for create, edit, and save.</p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Mode name\",\"monitoringMode.name\",\"Text input\",\"Business name of the monitoring mode.\"],[\"Temperature threshold\",\"monitoringMode.temperatureThreshold\",\"Number input\",\"Defines the acceptable temperature limit or range.\"],[\"CO2 threshold\",\"monitoringMode.co2Threshold\",\"Number input\",\"Defines the acceptable carbon dioxide limit or range.\"],[\"Save mode\",\"-\",\"Primary button\",\"Stores the configuration and makes the mode available for use.\"]]" columns="<uu5json/>[{\"header\":\"Name\",\"highlighted\":true,\"style\":{\"italic\":true}},{\"header\":\"Data binding\",\"style\":{\"italic\":true}},{\"header\":\"Component\",\"style\":{\"italic\":true}},{\"header\":\"Description\",\"style\":{\"italic\":true}}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Synchronize Offline Data">
  <Uu5Bricks.Section header="Trigger List">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Gateway\",\"Internet connectivity is restored after an outage and locally stored readings can be sent to the cloud application.\"]]" columns="<uu5json/>[{\"header\":\"Triggered by\"},{\"header\":\"Trigger Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Pre-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The gateway contains unsent readings in local storage and connectivity to the cloud application has become available again.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Post-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Previously unsent readings are uploaded to the cloud application, the local queue is reduced or cleared, and no valid data is lost.</p>"/>
  </Uu5Bricks.Section>
  <UuApp.DesignKit.BusinessScenario data="<uu5json/>{\"version\":\"1.0.0\",\"id\":\"buc-synchronize-offline-data\",\"name\":\"Business Use Case Specification\",\"description\":\"\",\"generateErrorList\":false,\"statementList\":[{\"name\":\"The gateway detects that connectivity to the cloud is available again.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-sync-step-1\",\"type\":\"step\",\"label\":\"1.\",\"statementList\":[]},{\"name\":\"The gateway reads unsent data from local storage.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-sync-step-2\",\"type\":\"step\",\"label\":\"2.\",\"statementList\":[]},{\"name\":\"The gateway sends the stored readings to the cloud application.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-sync-step-3\",\"type\":\"step\",\"label\":\"3.\",\"statementList\":[]},{\"name\":\"The cloud application accepts and stores the readings.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-sync-step-4\",\"type\":\"step\",\"label\":\"4.\",\"statementList\":[]},{\"name\":\"The gateway marks the synchronized data as sent and removes it according to retention rules.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-sync-step-5\",\"type\":\"step\",\"label\":\"5.\",\"statementList\":[]},{\"name\":\"The system shows that synchronization has completed successfully.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-sync-step-6\",\"type\":\"step\",\"label\":\"6.\",\"statementList\":[]}]}"/>
  <Uu5Bricks.Section contentEditable header="Mockups and Wireframes" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Gateway status panel or dashboard section with connection state, queued record count, last synchronization time, and successful recovery state.</p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Connection state\",\"gateway.connectivityStatus\",\"Status badge\",\"Shows whether the gateway currently has access to the cloud application.\"],[\"Queued records\",\"gateway.localQueueSize\",\"Numeric value\",\"Shows the number of locally stored readings waiting for synchronization.\"],[\"Last synchronization\",\"gateway.lastSyncAt\",\"Date-time field\",\"Shows the last successful data upload to the cloud application.\"],[\"Sync status\",\"gateway.registrationStatus\",\"Status badge\",\"Provides quick feedback that offline data recovery has completed successfully.\"]]" columns="<uu5json/>[{\"header\":\"Name\",\"highlighted\":true,\"style\":{\"italic\":true}},{\"header\":\"Data binding\",\"style\":{\"italic\":true}},{\"header\":\"Component\",\"style\":{\"italic\":true}},{\"header\":\"Description\",\"style\":{\"italic\":true}}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Receive and Resolve Alert">
  <Uu5Bricks.Section header="Trigger List">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"System\",\"A measured value exceeds the threshold defined by the active monitoring mode.\"],[\"Monitoring Operator\",\"The operator opens the application to inspect and resolve a highlighted dangerous state.\"]]" columns="<uu5json/>[{\"header\":\"Triggered by\"},{\"header\":\"Trigger Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Pre-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Monitoring mode thresholds are configured, incoming readings are available, and the user is authenticated for alert review.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Post-conditions" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The dangerous condition is visible to the user, the user understands which sensor and device caused it, and the alert can be treated as acknowledged or resolved according to the application design.</p>"/>
  </Uu5Bricks.Section>
  <UuApp.DesignKit.BusinessScenario data="<uu5json/>{\"version\":\"1.0.0\",\"id\":\"buc-receive-and-resolve-alert\",\"name\":\"Business Use Case Specification\",\"description\":\"\",\"generateErrorList\":false,\"statementList\":[{\"name\":\"A new reading is received by the system.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-alert-step-1\",\"type\":\"step\",\"label\":\"1.\",\"statementList\":[]},{\"name\":\"The system compares the reading with the active monitoring mode thresholds.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-alert-step-2\",\"type\":\"step\",\"label\":\"2.\",\"statementList\":[]},{\"name\":\"The system marks the reading as dangerous when a limit is exceeded.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-alert-step-3\",\"type\":\"step\",\"label\":\"3.\",\"statementList\":[]},{\"name\":\"The system shows visual warning information to the user and may send a notification.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-alert-step-4\",\"type\":\"step\",\"label\":\"4.\",\"statementList\":[]},{\"name\":\"The operator opens the related device or environment detail.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-alert-step-5\",\"type\":\"step\",\"label\":\"5.\",\"statementList\":[]},{\"name\":\"The operator evaluates the situation and records or performs the appropriate response.\",\"desc\":\"\",\"description\":\"\",\"id\":\"buc-alert-step-6\",\"type\":\"step\",\"label\":\"6.\",\"statementList\":[]}]}"/>
  <Uu5Bricks.Section contentEditable header="Mockups and Wireframes" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Dashboard or detail screen with warning modal, highlighted sensor values, device identification, and visible alert state.</p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Alert severity\",\"alertEvent.severity\",\"Badge\",\"Shows how serious the detected threshold violation is.\"],[\"Sensor type\",\"alertEvent.sensorType\",\"Text field\",\"Identifies which measurement category caused the alert.\"],[\"Measured value\",\"alertEvent.measuredValue\",\"Highlighted value field\",\"Shows the actual value that exceeded the configured threshold.\"],[\"Alert status\",\"alertEvent.status\",\"Status control\",\"Allows the user to review and treat the alert as active, acknowledged, or resolved.\"]]" columns="<uu5json/>[{\"header\":\"Name\",\"highlighted\":true,\"style\":{\"italic\":true}},{\"header\":\"Data binding\",\"style\":{\"italic\":true}},{\"header\":\"Component\",\"style\":{\"italic\":true}},{\"header\":\"Description\",\"style\":{\"italic\":true}}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>

