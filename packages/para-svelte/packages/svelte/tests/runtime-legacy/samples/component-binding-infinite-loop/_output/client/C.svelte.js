import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span><!></span>`);

export default function C($$anchor, $$props) {
	$.push($$props, false);

	let currentIdentifier = $.prop($$props, 'currentIdentifier', 12);
	let identifier = $.prop($$props, 'identifier', 12);
	let isCurrentlySelected = $.mutable_source();

	function toggle() {
		currentIdentifier($.get(isCurrentlySelected) ? null : identifier());
	}

	$.legacy_pre_effect(
		() => (
			$.deep_read_state(currentIdentifier()),
			$.deep_read_state(identifier())
		),
		() => {
			$.set(isCurrentlySelected, currentIdentifier() === identifier());
		}
	);

	$.legacy_pre_effect_reset();

	var $$exports = {
		get currentIdentifier() {
			return currentIdentifier();
		},

		set currentIdentifier($$value) {
			currentIdentifier($$value);
			$.flush();
		},

		get identifier() {
			return identifier();
		},

		set identifier($$value) {
			identifier($$value);
			$.flush();
		}
	};

	var span = root();
	var node = $.child(span);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(span);
	$.template_effect(() => $.set_class(span, 1, $.get(isCurrentlySelected) ? 'selected' : null));
	$.event('click', span, toggle);
	$.append($$anchor, span);

	return $.pop($$exports);
}