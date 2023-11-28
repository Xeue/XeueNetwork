import {Shell as _Shell} from 'xeue-shell';

export default class AP {
	constructor(Logs) {
    this.Logs = Logs;
    this.exec = new _Shell(this.Logs, 'NETWRK', 'W', 'bash').run;
  }

  async enable(options) {
    const file = options.interface + '-hostapd.conf';
    const commands = ['cat <<EOF >' + file + ' && hostapd -B ' + file + ' && rm -f ' + file];
    Object.getOwnPropertyNames(options).forEach(key => {
      commands.push(key + '=' + options[key]);
    });
    const {stdout} = await this.exec(commands.join('\n'));
    return stdout;
  }

  async disable(interface) {
    const file = interface + '-hostapd.conf';
    const {stdout} = await this.exec('kill `pgrep -f "^hostapd -B ' + file + '"` || true');
    return stdout;
  }

  async startDHCP(options) {
    const file = options.interface + '-udhcpd.conf';
    const commands = [].concat(
      'cat <<EOF >' + file + ' && udhcpd ' + file + ' && rm -f ' + file,
      this.#expand(options)
    );
    const {stdout} = await this.exec(commands.join('\n'));
    return stdout;
  }

  async stopDHCP(interface, callback) {
    const file = interface + '-udhcpd.conf';
    const {stdout} = this.exec('kill `pgrep -f "^udhcpd ' + file + '"` || true', callback);
    return stdout;
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
