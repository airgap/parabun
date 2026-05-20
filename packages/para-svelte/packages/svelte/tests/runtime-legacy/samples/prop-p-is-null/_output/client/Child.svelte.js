import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	const $$restProps = $.legacy_rest_props($$sanitized_props, []);

	$.push($$props, false);

	const x = $.mutable_source();
	const y = $.mutable_source();

	$.legacy_pre_effect(() => ($.deep_read_state($$restProps)), () => {
		$.set(x, Object.keys($$restProps).length);
	});

	$.legacy_pre_effect(() => ($.deep_read_state($$sanitized_props)), () => {
		$.set(y, Object.keys($$sanitized_props).length);
	});

	$.legacy_pre_effect_reset();
	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `${$.get(x) ?? ''} ${$.get(y) ?? ''}`));
	$.append($$anchor, text);
	$.pop();
}