import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from "svelte";

export default function Component2($$anchor, $$props) {
	$.push($$props, false);

	let logs = $.prop($$props, 'logs', 12);

	onMount(() => {
		logs().push("mount");

		return () => {
			logs().push("unmount");
		};
	});

	var $$exports = {
		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		}
	};

	$.init();

	return $.pop($$exports);
}