import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let primitive = $.prop($$props, 'primitive', 8);
	let object = $.prop($$props, 'object', 8);

	$.legacy_pre_effect(() => ($.deep_read_state(primitive())), () => {
		primitive() && console.log('primitive');
	});

	$.legacy_pre_effect(() => ($.deep_read_state(object())), () => {
		object() && console.log('object');
	});

	$.legacy_pre_effect_reset();
	$.pop();
}