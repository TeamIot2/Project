<Uu5Bricks.Section header="Processes" headerSeparator headerSeparatorColorScheme="blue">
  <Uu5Bricks.Section contentEditable header="Process Hierarchy" level={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The solution is organized around one main end-to-end business process and its first-level decomposition.</p><ul><li>P1 Environmental Monitoring Lifecycle Management</li><li>P1.1 Register and Configure Monitoring Infrastructure</li><li>P1.2 Collect Environmental Measurements</li><li>P1.3 Persist and Synchronize Readings</li><li>P1.4 Monitor Current State and Analyze History</li><li>P1.5 Manage Thresholds and Respond to Alerts</li></ul><p>Together, these processes cover the full path from physical measurement to business response.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Process Diagram" level={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>uuBML process hierarchy diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
  </Uu5Bricks.Section>
</Uu5Bricks.Section>

<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Environmental Monitoring Lifecycle Management">
  <Uu5Bricks.Section header="Process Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>The first decomposition of the main process will be inserted as a uuBML diagram separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Process Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>This is the main end-to-end process of the solution. It starts with preparing the monitoring infrastructure and continues through data collection, temporary gateway persistence, cloud synchronization, visualization, evaluation, and operational response to abnormal environmental values.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Process - Products Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related products diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Monitoring Device\"],[\"Gateway\"],[\"Environmental Reading\"],[\"Monitoring Mode\"],[\"Alert Event\"],[\"User Account\"],[\"Environment\"]]" columns="<uu5json/>[{\"header\":\"Related Product\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Business Use Case List Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related business use case diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Register Gateway\"],[\"Connect New Monitoring Device\"],[\"Start Monitoring\"],[\"Review Current Environmental State\"],[\"Review Measurement History\"],[\"Configure Monitoring Mode\"],[\"Synchronize Offline Data\"],[\"Receive and Resolve Alert\"]]" columns="<uu5json/>[{\"header\":\"Related Business Use Case\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>

<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Register and Configure Monitoring Infrastructure">
  <Uu5Bricks.Section header="Process Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Process diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Process Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>This process covers technical and business preparation of the monitoring setup. A gateway is registered, at least one monitoring device is connected, and the monitored environment is identified so that incoming data can be assigned to the correct place and shown to users.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Process - Products Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related products diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Gateway\"],[\"Monitoring Device\"],[\"Environment\"],[\"User Account\"]]" columns="<uu5json/>[{\"header\":\"Related Product\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Business Use Case List Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related business use case diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Register Gateway\"],[\"Connect New Monitoring Device\"]]" columns="<uu5json/>[{\"header\":\"Related Business Use Case\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>

<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Collect Environmental Measurements">
  <Uu5Bricks.Section header="Process Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Process diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Process Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The monitoring device periodically reads environmental sensors and sends the measured values to the gateway. This process ensures that the physical state of the monitored environment is converted into structured digital readings.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Process - Products Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related products diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Monitoring Device\"],[\"Environmental Reading\"],[\"Gateway\"]]" columns="<uu5json/>[{\"header\":\"Related Product\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Business Use Case List Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related business use case diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Start Monitoring\"]]" columns="<uu5json/>[{\"header\":\"Related Business Use Case\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>

<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Persist and Synchronize Readings">
  <Uu5Bricks.Section header="Process Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Process diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Process Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>The gateway stores received readings locally, performs basic preprocessing or downsampling if needed, and sends the readings to the cloud application over HTTPS. If connectivity is unavailable, the gateway keeps unsent data and synchronizes it later.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Process - Products Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related products diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Gateway\"],[\"Environmental Reading\"],[\"Alert Event\"]]" columns="<uu5json/>[{\"header\":\"Related Product\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Business Use Case List Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related business use case diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Synchronize Offline Data\"],[\"Receive and Resolve Alert\"]]" columns="<uu5json/>[{\"header\":\"Related Business Use Case\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>

<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Monitor Current State and Analyze History">
  <Uu5Bricks.Section header="Process Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Process diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Process Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Users inspect the latest measured values and historical time-series data through the web dashboard. The process supports understanding the current environmental state, identifying trends, and comparing device or sensor behavior over time.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Process - Products Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related products diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Environmental Reading\"],[\"Environment\"],[\"Monitoring Device\"],[\"User Account\"]]" columns="<uu5json/>[{\"header\":\"Related Product\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Business Use Case List Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related business use case diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Review Current Environmental State\"],[\"Review Measurement History\"]]" columns="<uu5json/>[{\"header\":\"Related Business Use Case\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>

<Uu5Bricks.Section headerSeparator headerSeparatorColorScheme="blue" header="Manage Thresholds and Respond to Alerts">
  <Uu5Bricks.Section header="Process Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Process diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
  </Uu5Bricks.Section>
  <Uu5Bricks.Section contentEditable header="Process Name" colorSchema={null}>
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p>Users define evaluation modes and threshold values that classify measured conditions. When readings exceed configured limits, the system highlights dangerous states and helps users react to them.</p>"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Process - Products Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related products diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Monitoring Mode\"],[\"Alert Event\"],[\"User Account\"],[\"Environmental Reading\"]]" columns="<uu5json/>[{\"header\":\"Related Product\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
  <Uu5Bricks.Section header="Business Use Case List Diagram">
    <Uu5RichTextBricks.Block uu5String="<uu5string/><p><i>Related business use case diagram will be inserted separately.</i></p>"/>
    <Uu5ImagingBricks.Image />
    <Uu5TilesBricks.Table data="<uu5json/>[[\"Configure Monitoring Mode\"],[\"Receive and Resolve Alert\"]]" columns="<uu5json/>[{\"header\":\"Related Business Use Case\"}]" theme="allBorders"/>
  </Uu5Bricks.Section>
</Uu5Bricks.Section>
