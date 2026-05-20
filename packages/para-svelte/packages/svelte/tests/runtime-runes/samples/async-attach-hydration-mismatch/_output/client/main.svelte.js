import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';
import Trigger from './Trigger.svelte';

var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor) {
	var data, trigger;

	var $$promises = $.run([
		async () => data = await $.async_derived(() => Promise.resolve(['a', 'b'])),
		() => trigger = $.state(void 0)
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	Outer(node, {
		children: ($$anchor, $$slotProps) => {
			{
				$.async($$anchor, [$$promises[1]], void 0, ($$anchor) => {
					Inner($$anchor, {
						[$.attachment()]: ($$node) => ($.get(trigger)?.action || $.noop)($$node),
						children: ($$anchor, $$slotProps) => {
							$.next();

							var text = $.text('foo');

							$.append($$anchor, text);
						},
						$$slots: { default: true }
					});
				});

				$.next();
			}
		},
		$$slots: { default: true }
	});

	var node_1 = $.sibling(node, 2);

	$.async(node_1, [$$promises[1]], void 0, ($$anchor) => {
		$.bind_this(Trigger(node_1, {}), ($$value) => $.set(trigger, $$value, true), () => $.get(trigger));
	});

	$.append($$anchor, fragment);
}