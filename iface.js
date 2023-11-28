import {Shell as _Shell} from 'xeue-shell';

export default class Iface {
	constructor(Logs) {
    this.Logs = Logs;
    this.exec = new _Shell(this.Logs, 'NETWRK', 'W', 'bash').run;
  }

  /*
  * [
  *   {
  *     interface: 'eth0',
  *     link: 'ethernet',
  *     address: 'b8:27:eb:da:52:ad',
  *     ipv4_address: '192.168.1.2',
  *     ipv4_broadcast: '192.168.1.255',
  *     ipv4_subnet_mask: '255.255.255.0',
  *     up: true,
  *     broadcast: true,
  *     running: true,
  *     multicast: true
  *   },
  *   {
  *     interface: 'lo',
  *     link: 'local',
  *     ipv4_address: '127.0.0.1',
  *     ipv4_subnet_mask: '255.0.0.0',
  *     up: true,
  *     running: true,
  *     loopback: true
  *   },
  *   {
  *     interface: 'wlan0',
  *     link: 'ethernet',
  *     address: '00:0b:81:95:12:21',
  *     ipv4_address: '192.168.10.1',
  *     ipv4_broadcast: '192.168.10.255',
  *     ipv4_subnet_mask: '255.255.255.0',
  *     up: true,
  *     broadcast: true,
  *     multicast: true
  *   }
  * ]
  */
  async status(iface = '') {
    const command =  iface == '' ? 'ifconfig -a' : `ifconfig ${iface}`;
    const {stdout} = await this.exec(command);
    if (iface == '') return this.#parse_status_block(stdout.trim());
    else return this.#parse_status(stdout);
  }

  async down(iface) {
    const {stdout} = await this.exec(`ifconfig ${iface} down`);
    return stdout;
  }

  async up(options) {
    const {stdout} = await this.exec(`ifconfig ${options.interface} ${options.address} netmask ${options.subnetMask} broadcast ${options.broadcast} up`);
    return stdout;
  }

  async startDHCP(options) {
    const {stdout} = this.exec('udhcpc -i ' + options.interface + ' -n');  
    return stdout;
  }


  async stopDHCP(interface) {
    const {stdout} = this.exec('kill `pgrep -f "^udhcpc -i ' + interface + '"` || true');  
    return stdout;
  }
  
  #parse_status_block(block) {
    let match;

    const parsed = {
      interface: block.match(/^([^\s^\:]+)/)[1]
    };

    if ((match = block.match(/Link encap:\s*([^\s]+)/))) {
      parsed.link = match[1].toLowerCase();
    }

    if ((match = block.match(/HWaddr\s+([^\s]+)/))) {
      parsed.address = match[1].toLowerCase();
    } else if ((match = block.match(/ether\s+([^\s]+)/))) {
      parsed.address = match[1].toLowerCase();
    }

    if ((match = block.match(/inet6\s+addr:\s*([^\s]+)/))) {
      parsed.ipv6_address = match[1];
    } else if ((match = block.match(/inet6\s*([^\s]+)/))) {
      parsed.ipv6_address = match[1];
    }

    if ((match = block.match(/inet\s+addr:\s*([^\s]+)/))) {
      parsed.ipv4_address = match[1];
    } else if ((match = block.match(/inet\s+([^\s]+)/))) {
      parsed.ipv4_address = match[1];
    }

    if ((match = block.match(/Bcast:\s*([^\s]+)/))) {
      parsed.ipv4_broadcast = match[1];
    } else if ((match = block.match(/broadcast\s*([^\s]+)/))) {
      parsed.ipv4_broadcast = match[1];
    }

    if ((match = block.match(/Mask:\s*([^\s]+)/))) {
      parsed.ipv4_subnet_mask = match[1];
    } else if ((match = block.match(/netmask\s*([^\s]+)/))) {
      parsed.ipv4_subnet_mask = match[1];
    }

    if ((match = block.match(/UP/))) {
      parsed.up = true;
    }

    if ((match = block.match(/BROADCAST/))) {
      parsed.broadcast = true;
    }

    if ((match = block.match(/RUNNING/))) {
      parsed.running = true;
    }

    if ((match = block.match(/MULTICAST/))) {
      parsed.multicast = true;
    }

    if ((match = block.match(/LOOPBACK/))) {
      parsed.loopback = true;
    }

    return parsed;
  }

  #parse_status(stdout) {
    return stdout.trim().split('\n\n').map(this.#parse_status_block);
  }
}