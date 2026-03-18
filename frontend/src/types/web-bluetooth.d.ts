interface BluetoothRemoteGATTCharacteristicEventMap {
  characteristicvaluechanged: Event;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value: DataView | null;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener<K extends keyof BluetoothRemoteGATTCharacteristicEventMap>(
    type: K,
    listener: (this: BluetoothRemoteGATTCharacteristic, ev: BluetoothRemoteGATTCharacteristicEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDeviceEventMap {
  gattserverdisconnected: Event;
}

interface BluetoothDevice extends EventTarget {
  gatt?: BluetoothRemoteGATTServer | null;
  name?: string;
  addEventListener<K extends keyof BluetoothDeviceEventMap>(
    type: K,
    listener: (this: BluetoothDevice, ev: BluetoothDeviceEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
}

interface RequestDeviceOptions {
  filters?: Array<{ services?: string[] }>;
  optionalServices?: string[];
}

interface Bluetooth {
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface Navigator {
  bluetooth: Bluetooth;
}
