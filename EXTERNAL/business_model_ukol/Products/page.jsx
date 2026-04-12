<Uu5Bricks.Section header="Product Overview" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Product Overview" level={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The business discipline works with physical monitoring infrastructure, measured data, configuration rules, and user-facing management records.</p><p>Monitoring Device produces Environmental Readings. Gateway receives readings from one or more devices and forwards them to the cloud application. Readings belong to an Environment and can be evaluated according to a Monitoring Mode. If thresholds are exceeded, an Alert Event is created or displayed. User Account gives authorized users access to monitoring, history, configuration, and operational actions.</p><p>The main product relations can be summarized as follows:</p><ul><li>User Account manages and uses the system.</li><li>Environment groups monitored spaces.</li><li>Monitoring Device operates in an Environment.</li><li>Gateway receives and synchronizes readings from Monitoring Devices.</li><li>Environmental Reading carries measured values.</li><li>Monitoring Mode defines acceptable thresholds.</li><li>Alert Event represents a threshold violation requiring user attention.</li></ul>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Product Overview Diagram" level={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Product overview class diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section header="User Account" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Product Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Represents an authenticated person who can access the cloud application and perform monitoring or administration actions.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Attributes">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"userId\",\"Unique identifier of the user account.\"],[\"name\",\"Display name of the user.\"],[\"email\",\"Login and contact e-mail of the user.\"],[\"role\",\"Business role of the user, for example administrator or operator.\"],[\"languagePreference\",\"Preferred application language.\"],[\"notificationPreference\",\"Preferred notification channel or disabled notifications.\"]]" columns="<uu5json/>[{\"header\":\"Attribute Name\"},{\"header\":\"Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section header="Environment" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Product Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Represents the monitored place or logical area in which devices operate and readings are interpreted.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Attributes">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"environmentId\",\"Unique identifier of the monitored environment.\"],[\"name\",\"Business name of the environment or room.\"],[\"description\",\"Short explanation of the environment purpose.\"],[\"location\",\"Physical or logical location of the environment.\"],[\"status\",\"Current operational state of the environment view.\"]]" columns="<uu5json/>[{\"header\":\"Attribute Name\"},{\"header\":\"Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section header="Monitoring Device" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Product Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Represents the physical IoT node used to sense the environment and the corresponding device record in the application.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Attributes">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"deviceId\",\"Unique identifier of the device.\"],[\"name\",\"User-defined display name of the device.\"],[\"hardwareType\",\"Type or version of the physical sensing node.\"],[\"connectionStatus\",\"Information whether the device is currently connected and sending data.\"],[\"assignedEnvironmentId\",\"Identifier of the environment in which the device operates.\"],[\"activeModeId\",\"Identifier of the monitoring mode currently assigned to the device.\"],[\"lastSeenAt\",\"Timestamp of the latest successful communication.\"]]" columns="<uu5json/>[{\"header\":\"Attribute Name\"},{\"header\":\"Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section header="Gateway" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Product Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Represents the intermediate component that receives data from devices, stores it temporarily, and synchronizes it with the cloud application.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Attributes">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"gatewayId\",\"Unique identifier of the gateway.\"],[\"name\",\"Display name of the gateway installation.\"],[\"registrationStatus\",\"State of registration in the cloud application.\"],[\"connectivityStatus\",\"Information whether the gateway can reach the cloud.\"],[\"localQueueSize\",\"Number of readings currently waiting in local storage.\"],[\"lastSyncAt\",\"Timestamp of the most recent successful synchronization.\"]]" columns="<uu5json/>[{\"header\":\"Attribute Name\"},{\"header\":\"Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section header="Environmental Reading" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Product Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Represents one measured or aggregated data record produced by a monitoring device and processed by the gateway and cloud application.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Attributes">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"readingId\",\"Unique identifier of the reading record.\"],[\"deviceId\",\"Identifier of the device that produced the reading.\"],[\"capturedAt\",\"Timestamp when the value was measured.\"],[\"temperature\",\"Measured temperature value.\"],[\"humidity\",\"Measured relative humidity value.\"],[\"pressure\",\"Measured atmospheric pressure value.\"],[\"co2\",\"Measured carbon dioxide concentration.\"],[\"lightLevel\",\"Measured ambient light intensity.\"],[\"noiseLevel\",\"Measured sound level or analog microphone-derived value.\"]]" columns="<uu5json/>[{\"header\":\"Attribute Name\"},{\"header\":\"Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section header="Monitoring Mode" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Product Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Represents a reusable set of evaluation thresholds and rules used to classify whether readings are acceptable, warning, or dangerous.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Attributes">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"modeId\",\"Unique identifier of the monitoring mode.\"],[\"name\",\"Business name of the mode.\"],[\"description\",\"Short explanation of the intended usage of the mode.\"],[\"temperatureThreshold\",\"Configured temperature limit or range.\"],[\"humidityThreshold\",\"Configured humidity limit or range.\"],[\"co2Threshold\",\"Configured carbon dioxide limit or range.\"],[\"lightThreshold\",\"Configured light limit or range.\"],[\"noiseThreshold\",\"Configured noise limit or range.\"]]" columns="<uu5json/>[{\"header\":\"Attribute Name\"},{\"header\":\"Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>


<Uu5Bricks.Section header="Alert Event" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Product Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Represents a situation in which one or more measured values exceed the allowed thresholds and require user attention.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Attributes">
    <Uu5TilesBricks.Table data="<uu5json/>[[\"alertId\",\"Unique identifier of the alert event.\"],[\"deviceId\",\"Identifier of the device related to the alert.\"],[\"environmentId\",\"Identifier of the affected environment.\"],[\"triggeredAt\",\"Timestamp when the alert was triggered.\"],[\"severity\",\"Business severity of the alert, for example warning or critical.\"],[\"sensorType\",\"Sensor category that caused the alert.\"],[\"measuredValue\",\"Actual value that violated the threshold.\"],[\"status\",\"Current state of the alert, for example active or resolved.\"]]" columns="<uu5json/>[{\"header\":\"Attribute Name\"},{\"header\":\"Description\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>

