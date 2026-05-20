import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Sub from './Sub.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let selected = $.prop($$props, 'selected', 12);
	let banana = {};
	let component = $.mutable_source(banana);

	$.legacy_pre_effect(() => ($.deep_read_state(selected()), Sub), () => {
		selected() ? $.set(component, Sub) : $.set(component, banana);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => $.get(component), ($$anchor, $$component) => {
		$$component($$anchor, {});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}