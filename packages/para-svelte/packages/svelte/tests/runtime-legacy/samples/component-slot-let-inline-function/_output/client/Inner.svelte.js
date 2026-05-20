import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Inner($$anchor, $$props) {
	$.push($$props, false);

	let log = $.prop($$props, 'log', 12);
	let b = $.prop($$props, 'b', 12);

	function innerCall(a) {
		log()(`a: ${a}, b: ${b()}`);
	}

	var $$exports = {
		get log() {
			return log();
		},

		set log($$value) {
			log($$value);
			$.flush();
		},

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'inner_slot', { innerCall }, null);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}