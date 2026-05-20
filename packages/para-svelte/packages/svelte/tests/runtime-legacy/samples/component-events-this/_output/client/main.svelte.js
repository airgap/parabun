import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';
import Inner from './Inner.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let logs = $.prop($$props, 'logs', 28, () => []);

	function foo() {
		logs().push(this);
	}

	function bar() {
		logs().push(this);
	}

	var $$exports = {
		Inner,
		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		}
	};

	$.init();
	Widget($$anchor, { $$events: { click: foo, bar } });
	$.bind_prop($$props, 'Inner', Inner);

	return $.pop($$exports);
}