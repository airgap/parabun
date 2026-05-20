import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Inner from "./inner.svelte";

export default function Wrapper2($$anchor, $$props) {
	$.push($$props, true);

	const getter = $.prop($$props, 'getter', 11, () => -1);

	Inner($$anchor, {
		get getter() {
			return getter();
		}
	});

	$.pop();
}