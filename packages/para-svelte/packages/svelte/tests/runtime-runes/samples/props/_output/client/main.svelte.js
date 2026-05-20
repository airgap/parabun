import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const default1 = $.prop($$props, 'default1', 3, 1),
		default2 = $.prop($$props, 'default2', 3, 2),
		default3 = $.prop($$props, 'default3', 3, 3),
		others = $.rest_props($$props, [
			'$$slots',
			'$$events',
			'$$legacy',
			'foo',
			'default1',
			'default2',
			'default3'
		]);

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `${$$props.foo ?? ''} ${default1() ?? ''} ${default2() ?? ''} ${default3() ?? ''} ${$$props.bar ?? ''}`));
	$.append($$anchor, text);
	$.pop();
}