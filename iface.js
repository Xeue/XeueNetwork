import {Shell as _Shell} from 'xeue-shell';
Object.prototype.forEach = function(callback) {for (const key in this) {
	if (Object.hasOwnProperty.call(this, key)) callback.call(this, key, this[key]);
}}

export default class Iface {
	constructor(Logs, sudo = false) {
    this.Logs = Logs;
    this.Shell = new _Shell(this.Logs, 'NETWRK', 'W', 'bash');
    this.sudo = sudo ? 'sudo ' : '';
  }

  /*
  * [
  *   {
  *       "ifindex": 1,
  *       "ifname": "lo",
  *       "flags": [
  *           "LOOPBACK",
  *           "UP",
  *           "LOWER_UP"
  *       ],
  *       "mtu": 65536,
  *       "qdisc": "noqueue",
  *       "operstate": "UNKNOWN",
  *       "group": "default",
  *       "txqlen": 1000,
  *       "link_type": "loopback",
  *       "address": "00:00:00:00:00:00",
  *       "broadcast": "00:00:00:00:00:00",
  *       "addr_info": [
  *           {
  *               "family": "inet",
  *               "local": "127.0.0.1",
  *               "prefixlen": 8,
  *               "scope": "host",
  *               "label": "lo",
  *               "valid_life_time": 4294967295,
  *               "preferred_life_time": 4294967295
  *           },
  *           {
  *               "family": "inet6",
  *               "local": "::1",
  *               "prefixlen": 128,
  *               "scope": "host",
  *               "valid_life_time": 4294967295,
  *               "preferred_life_time": 4294967295
  *           }
  *       ]
  *   }
  * ]
  */
  async status(iface = '') {
    const command =  iface == '' ? 'ip -j a' : `ip -j a s ${iface}`;
    const {stdout} = await this.Shell.run(this.sudo+command, false);
    const ifaces = JSON.parse(stdout.join(''));
    const routesOut = await this.Shell.run(this.sudo+'ip -j r list', false);
    const routes = JSON.parse(routesOut.stdout.join('')).filter(route=>route.dst=='default');
    const routesDev = routes.map(route=>route.dev);
    ifaces.forEach(iface => {
      if (routesDev.includes(iface.ifname)) {
        iface.gateway = routes[routesDev.indexOf(iface.ifname)].gateway;
      }
    })
    return ifaces;
  }

  async setIP(iface, addrObj) {
    if (!addrObj.mask) return
    if (addrObj.ipv4) await this.Shell.run(this.sudo+`ip addr add ${addrObj.ipv4}/${addrObj.mask} dev ${iface}`, false);
    if (addrObj.gateway) await this.Shell.run(this.sudo+`ip route add default ${addrObj.gateway}/${addrObj.mask} dev ${iface}`, false);
  }

  async bridgeAdd(iface) {
    await this.Shell.run(`ip link add name br0 type bridge`);
    await this.Shell.run(`ip link set dev br0 up`);
    await this.Shell.run(`ip link set dev ${iface} master br0`);
  }

  async bridgeRemove(iface) {
    await this.Shell.run(`ip link set dev ${iface} nomaster`);
  }

  async down(iface) {
    const {stdout} = await this.Shell.run(this.sudo+`ip link set dev ${iface} down`, false);
    return stdout[0];
  }

  async up(iface) {
    const {stdout} = await this.Shell.run(this.sudo+`ip link set dev ${iface} up`, false);
    return stdout[0];
  }

  async startDHCP(options) {
    const {stdout} = this.Shell.run(this.sudo+'udhcpc -i ' + options.interface + ' -n', false);
    return stdout[0];
  }


  async stopDHCP(iface) {
    const {stdout} = this.Shell.run(this.sudo+'kill `pgrep -f "^udhcpc -i ' + iface + '"` || true', false);  
    return stdout[0];
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
    const ifaces = stdout.trim().split('\n\n').map(this.#parse_status_block);
    ifaces.forEach(iface => {
      if (iface.interface == 'lo') ifaces.splice(ifaces.indexOf(iface), 1);
    });
    return ifaces;
  }
}