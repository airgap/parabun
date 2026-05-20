import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { hydratable } from "svelte";

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const value = hydratable("environment", () => Promise.resolve({
		nested: Promise.resolve({ environment: $$props.environment })
	}));

	var p = root();
	var text = $.child(p);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text, `The current environment is: ${$0 ?? ''}`), void 0, [
		() => value.then((res) => res.nested).then((res) => res.environment)
	]);

	$.append($$anchor, p);
	$.pop();
}