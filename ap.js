import {Shell as _Shell} from 'xeue-shell';

export default class AP {
	constructor(Logs, sudo = false) {
    this.Logs = Logs;
    this.Shell = new _Shell(this.Logs, 'NETWRK', 'W', 'bash');
    this.sudo = sudo ? 'sudo ' : '';
  }

  async enable(options) {
    const file = options.interface + '-hostapd.conf';
    const commands = ['cat <<EOF >' + file + ' && hostapd -B ' + file + ' && rm -f ' + file];
    Object.getOwnPropertyNames(options).forEach(key => {
      commands.push(key + '=' + options[key]);
    });
    const {stdout} = await this.Shell.run(this.sudo+commands.join('\n'), false);
    return stdout[0];
  }

  async disable(iface) {
    const file = iface + '-hostapd.conf';
    const {stdout} = await this.Shell.run(this.sudo+'kill `pgrep -f "^hostapd -B ' + file + '"` || true', false);
    return stdout[0];
  }

  async startDHCP(options) {
    const file = options.interface + '-udhcpd.conf';
    const commands = [].concat(
      'cat <<EOF >' + file + ' && udhcpd ' + file + ' && rm -f ' + file,
      this.#expand(options)
    );
    const {stdout} = await this.Shell.run(this.sudo+commands.join('\n'), false);
    return stdout[0];
  }

  async stopDHCP(iface) {
    const file = iface + '-udhcpd.conf';
    const {stdout} = this.Shell.run(this.sudo+'kill `pgrep -f "^udhcpd ' + file + '"` || true', false);
    return stdout[0];
  }

  #expand_r(options, lines, prefix) {
    Object.getOwnPropertyNames(options).forEach(function(key) {
      let full = prefix.concat(key);
      const value = options[key];
  
      if (Array.isArray(value)) {
        value.forEach(function(val) {
          lines.push(full.concat(val).join(' '));
        });      
      }
      else if (typeof(value) == 'object') {
        this.#expand_r(value, lines, full);
      }
      else {
        lines.push(full.concat(value).join(' '));
      }
    });
  }
  
  #expand(options) {
    const lines = [];
    this.#expand_r(options, lines, []);
    return lines;
  }
}
