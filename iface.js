import {Shell as _Shell} from 'xeue-shell';
import EventEmitter from 'events';
Object.prototype.forEach = function(callback) {for (const key in this) {
	if (Object.hasOwnProperty.call(this, key)) callback.call(this, key, this[key]);
}}

export default class Iface extends EventEmitter {
	constructor(Logs, sudo = false) {
    super();
    this.Logs = Logs;
    this.Shell = new _Shell(this.Logs, 'NETWRK', 'W', 'bash');
    this.sudo = sudo ? 'sudo ' : '';
    this.watcher = this.Shell.process('ip -s monitor label', false);
    this.watcher.on('stdout', message => this.#doWatch(message))
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
    try {      
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
    } catch (error) {
      //this.Logs.error(error);
    }
  }

  async setIP(iface, addrObj) {
    if (!addrObj.mask || !addrObj.ipv4) return
    await this.Shell.run(this.sudo+`ip addr flush dev ${iface}`, false);
    await this.Shell.run(this.sudo+`ip addr add ${addrObj.ipv4}/${addrObj.mask} dev ${iface}`, false);
    await this.Shell.run(this.sudo+`ip addr add 192.168.123.1/16 dev ${iface}`, false);
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
    if (!stdout) return;
    return stdout[0];
  }

  async up(iface) {
    const {stdout} = await this.Shell.run(this.sudo+`ip link set dev ${iface} up`, false);
    if (!stdout) return;
    return stdout[0];
  }

  async startDHCP(iface) {
    await this.Shell.run(this.sudo+`ip addr flush dev ${iface}`, false);
    await this.Shell.run(this.sudo+`ip addr add 192.168.123.1/16 dev ${iface}`, false);
    const {stdout} = this.Shell.run(this.sudo+'udhcpc -i ' + iface + ' -n', false);
    if (!stdout) return;
    return stdout[0];
  }

  async stopDHCP(iface) {
    const {stdout} = this.Shell.run(this.sudo+'kill `pgrep -f "^udhcpc -i ' + iface + '"` || true', false);
    if (!stdout) return;
    return stdout[0];
  }

  #doWatch(message) {
    const messageArr = message.split('\n');
    messageArr.forEach(msg => {
      if (msg.includes('[ADDR]')) this.emit('addr');
      if (msg.includes('state DOWN group default')) this.emit('state');
      if (msg.includes('state UP group default')) this.emit('state');
    })
  }
}