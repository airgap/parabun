import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

let moduleA = 'moduleA';
let moduleB = 'moduleB';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const a = $.mutable_source();
	const b = $.mutable_source();

	function updateModuleA() {
		moduleA = 'something else';
	}

	function reset() {
		moduleA = 'moduleA';
	}

	$.legacy_pre_effect(() => {}, () => {
		$.set(a, moduleA);
	});

	$.legacy_pre_effect(() => {}, () => {
		$.set(b, moduleB);
	});

	$.legacy_pre_effect_reset();

	var $$exports = { updateModuleA, reset };

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `a: ${$.get(a) ?? ''}
b: ${$.get(b) ?? ''}
moduleA: ${moduleA ?? ''}
moduleB: moduleB`));

	$.append($$anchor, text);
	$.bind_prop($$props, 'updateModuleA', updateModuleA);
	$.bind_prop($$props, 'reset', reset);

	return $.pop($$exports);
}