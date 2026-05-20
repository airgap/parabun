import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let animalEntries = $.prop($$props, 'animalEntries', 12);
	const defaultHeight = 30;

	var $$exports = {
		defaultHeight,
		get animalEntries() {
			return animalEntries();
		},

		set animalEntries($$value) {
			animalEntries($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, animalEntries, $.index, ($$anchor, $$item) => {
		let animal = () => $.get($$item).animal;
		let species = $.derived_safe_equal(() => $.fallback($.get($$item).species, 'unknown'));
		let weight = $.derived_safe_equal(() => $.fallback($.get($$item).kilogram, 50));
		let pound = $.derived_safe_equal(() => $.fallback($.get($$item).pound, () => ($.get(weight) * 2.2).toFixed(0), true));
		let height = $.derived_safe_equal(() => $.fallback($.get($$item).height, defaultHeight));
		let bmi = $.derived_safe_equal(() => $.fallback($.get($$item).bmi, $.get(weight) / ($.get(height) * $.get(height))));
		let props = () => $.exclude_from_object($.get($$item), ['animal', 'species', 'kilogram', 'pound', 'height', 'bmi']);
		var p = root_1();

		$.attribute_effect(p, () => ({ ...props() }));

		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `${animal() ?? ''} - ${$.get(species) ?? ''} - ${$.get(weight) ?? ''}kg (${$.get(pound) ?? ''} lb) - ${$.get(height) ?? ''}cm - ${$.get(bmi) ?? ''}`));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'defaultHeight', defaultHeight);

	return $.pop($$exports);
}