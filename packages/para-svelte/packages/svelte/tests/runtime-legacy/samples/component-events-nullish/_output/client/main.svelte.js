import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let logs = $.prop($$props, 'logs', 28, () => []);

	var $$exports = {
		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		}
	};

	Widget($$anchor, {
		get logs() {
			return logs();
		},

		$$events: {
			click(...$$args) {
				(null)?.apply(this, $$args);
			}
		}
	});

	return $.pop($$exports);
}