const ByteArray = imports.byteArray
const glib = imports.gi.GLib
const gio = imports.gi.Gio
const mainloop = imports.mainloop

const sleep = ms => new Promise(f => setTimeout(() => f(true), ms))
const first = x => x[0]
const second = x => x[1]
const last = x => x[x.length-1]
const tail = x => x.slice(1)
const init = x => x.slice(0, x.length-1)
const home = (...xs) => xs.length ? path_join(glib.get_home_dir(), ...xs) : glib.get_home_dir()
const path_join = (...xs) => xs.join('/').replace(/\/+/, '/')
const getenv = x => glib.getenv(x)
const setenv = (k, v) => glib.setenv(k, v, true)
const hostname = () => glib.get_host_name()

const PROCESSES = new Map()
const stdin = new gio.DataOutputStream({ base_stream: new gio.UnixOutputStream({ fd: 0 }) })
const stdout = new gio.DataOutputStream({ base_stream: new gio.UnixOutputStream({ fd: 1 }) })
const stderr = new gio.DataOutputStream({ base_stream: new gio.UnixOutputStream({ fd: 2 }) })

function setTimeout(f, ms) {
	return mainloop.timeout_add(ms, () => {
		f()
		return false
	}, null)
}

const clearTimeout = x => mainloop.source_remove(x)

function read_file(pathname, text=false) {
	const [status, contents] = glib.file_get_contents(pathname)
	if (status === false) throw 'error reading file ' + pathname
	else if (text) return ByteArray.toString(contents)
	else return contents
}

function spawn_async(cmd, env=null, name=null) {
	const [ok, pid ] = glib.spawn_async(null, cmd, env, 0, null)
	if (ok !== true) throw 'error spawning command ' + cmd.join(' ')
	else {
		if (name) PROCESSES.set(name, pid)
		return pid
	}
}

function spawn_sync(cmd, env=null) {
	const [ok, out, err, status ] = glib.spawn_sync(null, cmd, env, 0, null)
	if (ok !== true) throw 'error spawning command ' + cmd.join(' ')
	if (status !== 0) throw 'error executing command ' + ByteArray.toString(err)
	else return {
		stdout: out,
		stderr: err,
		status: status,
	}
}

function xinit() {
	const tty = getenv('XDG_VTNR')
	spawn_async(
		['/usr/bin/Xorg', `:${tty}`, '-auth', '/tmp/Xauthority', '-noreset', '-keeptty', `vt${tty}`],
		null,
		'Xorg'
	)
	setenv('DISPLAY', `:${tty}`)
	glib.usleep(2e5)
	xinitrc()
}

eval(read_file(home('.jslandrc'), true))
function main() {
	if (xinitrc) xinit()
}

try { main() }
catch(e) { print(e) }
